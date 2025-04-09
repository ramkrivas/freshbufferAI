import chatflowsApi from '@/api/chatflows'
import nodesApi from '@/api/nodes'
import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'
import {
    REMOVE_DIRTY,
    SET_CHATFLOW,
    SET_DIRTY
} from '@/store/actions'
import { FRESHBUFFERAI_CREDENTIAL_ID } from '@/store/constant'
import { flowContext } from '@/store/context/ReactFlowContext'
import { AppBar } from '@mui/material'
import { cloneDeep, omit } from 'lodash'
import { useContext, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'
import CanvasHeader from '../CanvasHeader'
import './Designer.css'

export const DesignerHeader = ({  setNodes, setEdges }) => {
    const { reactFlowInstance } = useContext(flowContext)
    const URLpath = document.location.pathname.toString().split('/')
    const { state } = useLocation()
    const chatflowId =
        URLpath[URLpath.length - 1] === 'canvas' || URLpath[URLpath.length - 1] === 'agentcanvas' ? '' : URLpath[URLpath.length - 1]
    const canvas = useSelector((state) => state.canvas)
    const [canvasDataStore, setCanvasDataStore] = useState(canvas)
    const canvasTitle = URLpath.includes('agentcanvas') ? 'Agent' : 'Chatflow'
    const [chatflow, setChatflow] = useState(null)

    const isAgentCanvas = URLpath.includes('agentcanvas') ? true : false
    const createNewChatflowApi = useApi(chatflowsApi.createNewChatflow)
    const updateChatflowApi = useApi(chatflowsApi.updateChatflow)
    const getNodesApi = useApi(nodesApi.getAllNodes)
    const getSpecificChatflowApi = useApi(chatflowsApi.getSpecificChatflow)
    const dispatch = useDispatch()
    const { confirm } = useConfirm()
    const handleSaveFlow = (chatflowName) => {
        debugger;
        if (reactFlowInstance) {
            const nodes = reactFlowInstance.getNodes().map((node) => {
                const nodeData = cloneDeep(node.data)
                if (Object.prototype.hasOwnProperty.call(nodeData.inputs, FRESHBUFFERAI_CREDENTIAL_ID)) {
                    nodeData.credential = nodeData.inputs[FRESHBUFFERAI_CREDENTIAL_ID]
                    nodeData.inputs = omit(nodeData.inputs, [FRESHBUFFERAI_CREDENTIAL_ID])
                }
                node.data = {
                    ...nodeData,
                    selected: false
                }
                return node
            })

            const rfInstanceObject = reactFlowInstance.toObject()
            rfInstanceObject.nodes = nodes
            const flowData = JSON.stringify(rfInstanceObject)

            if (!chatflow.id) {
                const newChatflowBody = {
                    name: chatflowName,
                    deployed: false,
                    isPublic: false,
                    flowData,
                    type: isAgentCanvas ? 'MULTIAGENT' : 'CHATFLOW'
                }
                createNewChatflowApi.request(newChatflowBody)
            } else {
                const updateBody = {
                    name: chatflowName,
                    flowData
                }
                updateChatflowApi.request(chatflow.id, updateBody)
            }
        }
    }
    const saveChatflowSuccess = () => {
        dispatch({ type: REMOVE_DIRTY })
        alert(`${canvasTitle} saved successfully`)
    }
    useEffect(() => {
        setChatflow(canvasDataStore.chatflow)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvasDataStore.chatflow])

    useEffect(() => {
        setCanvasDataStore(canvas)
    }, [canvas])

    // Get specific chatflow successful
    useEffect(() => {
        if (getSpecificChatflowApi.data) {
            const chatflow = getSpecificChatflowApi.data
            const initialFlow = chatflow.flowData ? JSON.parse(chatflow.flowData) : []
            setNodes(initialFlow.nodes || [])
            setEdges(initialFlow.edges || [])
            dispatch({ type: SET_CHATFLOW, chatflow })
        } else if (getSpecificChatflowApi.error) {
            alert(`Failed to retrieve ${canvasTitle}: ${getSpecificChatflowApi.error.response.data.message}`)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificChatflowApi.data, getSpecificChatflowApi.error])

    // Create new chatflow successful
    useEffect(() => {
        if (createNewChatflowApi.data) {
            const chatflow = createNewChatflowApi.data
            dispatch({ type: SET_CHATFLOW, chatflow })
            saveChatflowSuccess()
            window.history.replaceState(state, null, `/${isAgentCanvas ? 'agentcanvas' : 'canvas'}/${chatflow.id}`)
        } else if (createNewChatflowApi.error) {
            alert(`Failed to save ${canvasTitle}: ${createNewChatflowApi.error.response.data.message}`)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [createNewChatflowApi.data, createNewChatflowApi.error])

    // Update chatflow successful
    useEffect(() => {
        if (updateChatflowApi.data) {
            dispatch({ type: SET_CHATFLOW, chatflow: updateChatflowApi.data })
            saveChatflowSuccess()
        } else if (updateChatflowApi.error) {
            alert(`Failed to save ${canvasTitle}: ${updateChatflowApi.error.response.data.message}`)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [updateChatflowApi.data, updateChatflowApi.error])

    const handleLoadFlow = (file) => {
        try {
            const flowData = JSON.parse(file)
            const nodes = flowData.nodes || []

            setNodes(nodes)
            setEdges(flowData.edges || [])
            setTimeout(() => setDirty(), 0)
        } catch (e) {
            console.error(e)
        }
    }

    const handleDeleteFlow = async () => {
        const confirmPayload = {
            title: `Delete`,
            description: `Delete ${canvasTitle} ${chatflow.name}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                await chatflowsApi.deleteChatflow(chatflow.id)
                localStorage.removeItem(`${chatflow.id}_INTERNAL`)
                navigate(isAgentCanvas ? '/agentflows' : '/')
            } catch (error) {
              alert(typeof error.response.data === 'object' ? error.response.data.message : error.response.data)
            }
        }
    }

    const setDirty = () => {
        dispatch({ type: SET_DIRTY })
    }

    // Initialization
    useEffect(() => {
        if (chatflowId) {
            getSpecificChatflowApi.request(chatflowId)
        } else {
            if (localStorage.getItem('duplicatedFlowData')) {
                handleLoadFlow(localStorage.getItem('duplicatedFlowData'))
                setTimeout(() => localStorage.removeItem('duplicatedFlowData'), 0)
            } else {
                setNodes([])
                setEdges([])
            }
            dispatch({
                type: SET_CHATFLOW,
                chatflow: {
                    name: `Untitled ${canvasTitle}`
                }
            })
        }

        getNodesApi.request()

        // Clear dirty state before leaving and remove any ongoing test triggers and webhooks
        return () => {
            setTimeout(() => dispatch({ type: REMOVE_DIRTY }), 0)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <AppBar className='appBar'>
            <CanvasHeader
                chatflow={chatflow}
                handleSaveFlow={handleSaveFlow}
                handleDeleteFlow={handleDeleteFlow}
                handleLoadFlow={handleLoadFlow}
                isAgentCanvas={isAgentCanvas}
            />
        </AppBar>
    )
}

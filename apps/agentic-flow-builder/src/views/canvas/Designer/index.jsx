import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import ReactFlow, { addEdge, Controls, useEdgesState, useNodesState } from 'reactflow'
import 'reactflow/dist/style.css'

import {
    SET_DIRTY
} from '@/store/actions'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'

// material-ui
import { Box } from '@mui/material'

// project imports
import { flowContext } from '@/store/context/ReactFlowContext'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import ButtonEdge from '../ButtonEdge'
import CanvasNode from '../Node/CanvasNode'
import StickyNote from '../StickyNote'

// API

// Hooks
import { ChatMessage } from '../../chatmessage/ChatMessage'

// icons
import '../index.css'

// utils
import { getUniqueNodeId, initNode, rearrangeToolsOrdering } from '@/utils/genericHelper'
import { usePrompt } from '@/utils/usePrompt'
import { NodesList } from '../NodesList'
// const
import { DesignerHeader } from './Header'

const nodeTypes = { customNode: CanvasNode, stickyNote: StickyNote }
const edgeTypes = { buttonedge: ButtonEdge }

// ==============================|| CANVAS ||============================== //

const Canvas = () => {
    const { state } = useLocation()
    const templateFlowData = state ? state.templateFlowData : ''

    const URLpath = document.location.pathname.toString().split('/')
    const chatflowId =
        URLpath[URLpath.length - 1] === 'canvas' || URLpath[URLpath.length - 1] === 'agentcanvas' ? '' : URLpath[URLpath.length - 1]
    const isAgentCanvas = URLpath.includes('agentcanvas') ? true : false

    const [showChat, setShowChat] = useState(false)

    const dispatch = useDispatch()
    const canvas = useSelector((state) => state.canvas)
    const [canvasDataStore, setCanvasDataStore] = useState(canvas)

    const { reactFlowInstance, setReactFlowInstance } = useContext(flowContext)



    // ==============================|| ReactFlow ||============================== //

    const [nodes, setNodes, onNodesChange] = useNodesState()
    const [edges, setEdges, onEdgesChange] = useEdgesState()
    const [previews, setPreviews] = useState([])

    const reactFlowWrapper = useRef(null)

    // ==============================|| Events & Actions ||============================== //

    const onConnect = (params) => {
        const newEdge = {
            ...params,
            type: 'buttonedge',
            id: `${params.source}-${params.sourceHandle}-${params.target}-${params.targetHandle}`
        }

        const targetNodeId = params.targetHandle.split('-')[0]
        const sourceNodeId = params.sourceHandle.split('-')[0]
        const targetInput = params.targetHandle.split('-')[2]

        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === targetNodeId) {
                    setTimeout(() => setDirty(), 0)
                    let value
                    const inputAnchor = node.data.inputAnchors.find((ancr) => ancr.name === targetInput)
                    const inputParam = node.data.inputParams.find((param) => param.name === targetInput)

                    if (inputAnchor && inputAnchor.list) {
                        const newValues = node.data.inputs[targetInput] || []
                        if (targetInput === 'tools') {
                            rearrangeToolsOrdering(newValues, sourceNodeId)
                        } else {
                            newValues.push(`{{${sourceNodeId}.data.instance}}`)
                        }
                        value = newValues
                    } else if (inputParam && inputParam.acceptVariable) {
                        value = node.data.inputs[targetInput] || ''
                    } else {
                        value = `{{${sourceNodeId}.data.instance}}`
                    }
                    node.data = {
                        ...node.data,
                        inputs: {
                            ...node.data.inputs,
                            [targetInput]: value
                        }
                    }
                }
                return node
            })
        )

        setEdges((eds) => addEdge(newEdge, eds))
    }

    // eslint-disable-next-line
    const onNodeClick = useCallback((event, clickedNode) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === clickedNode.id) {
                    node.data = {
                        ...node.data,
                        selected: true
                    }
                } else {
                    node.data = {
                        ...node.data,
                        selected: false
                    }
                }

                return node
            })
        )
    })

    const onDragOver = useCallback((event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
    }, [])

    const onDrop = useCallback(
        (event) => {
            event.preventDefault()
            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
            let nodeData = event.dataTransfer.getData('application/reactflow')

            // check if the dropped element is valid
            if (typeof nodeData === 'undefined' || !nodeData) {
                return
            }

            nodeData = JSON.parse(nodeData)

            const position = reactFlowInstance.project({
                x: event.clientX - reactFlowBounds.left - 100,
                y: event.clientY - reactFlowBounds.top - 50
            })

            const newNodeId = getUniqueNodeId(nodeData, reactFlowInstance.getNodes())

            const newNode = {
                id: newNodeId,
                position,
                type: nodeData.type !== 'StickyNote' ? 'customNode' : 'stickyNote',
                data: initNode(nodeData, newNodeId)
            }

            setNodes((nds) =>
                nds.concat(newNode).map((node) => {
                    if (node.id === newNode.id) {
                        node.data = {
                            ...node.data,
                            selected: true
                        }
                    } else {
                        node.data = {
                            ...node.data,
                            selected: false
                        }
                    }

                    return node
                })
            )
            setTimeout(() => setDirty(), 0)
        },

        // eslint-disable-next-line
        [reactFlowInstance]
    )

    const setDirty = () => {
        dispatch({ type: SET_DIRTY })
    }

    useEffect(() => {
        setCanvasDataStore(canvas)
    }, [canvas])

    useEffect(() => {
        if (templateFlowData && templateFlowData.includes('"nodes":[') && templateFlowData.includes('],"edges":[')) {
            handleLoadFlow(templateFlowData)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [templateFlowData])

    usePrompt('You have unsaved changes! Do you want to navigate away?', canvasDataStore.isDirty)

    return (
        <>
            <Box>
                <DesignerHeader setNodes={setNodes} setEdges={setEdges} />
                <Box sx={{ pt: '70px', height: '100vh', width: '100%' }}>
                    <NodesList
                  
                        setShowChat={setShowChat}
                        isAgentCanvas={isAgentCanvas}
                        chatFlowId={chatflowId}
                    />
                    {!showChat ? (
                        <div className='reactflow-parent-wrapper'>
                            <div className='reactflow-wrapper' ref={reactFlowWrapper}>
                                <ReactFlow
                                    nodes={nodes}
                                    edges={edges}
                                    onNodesChange={onNodesChange}
                                    onNodeClick={onNodeClick}
                                    onEdgesChange={onEdgesChange}
                                    onDrop={onDrop}
                                    onDragOver={onDragOver}
                                    onNodeDragStop={setDirty}
                                    nodeTypes={nodeTypes}
                                    edgeTypes={edgeTypes}
                                    onConnect={onConnect}
                                    onInit={setReactFlowInstance}
                                    fitView
                                    deleteKeyCode={canvas.canvasDialogShow ? null : ['Delete']}
                                    minZoom={0.1}
                                    className='my-custom-flow'
                                >
                                    <Controls
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            left: '50%',
                                            color: '#00000',
                                            transform: 'translate(-50%, -50%)'
                                        }}
                                    />
                                    {/* <Background color='#aaa' gap={16} variant="cross"    /> */}
                                </ReactFlow>
                            </div>
                        </div>
                    ) : (
                        <ChatMessage
                            isAgentCanvas={isAgentCanvas}
                            chatflowid={chatflowId}
                            open={true}
                            previews={previews}
                            setPreviews={setPreviews}
                        />
                    )}
                </Box>
                <ConfirmDialog />
            </Box>
        </>
    )
}

export default Canvas

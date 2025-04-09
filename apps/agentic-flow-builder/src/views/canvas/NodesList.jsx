import DesignServicesIcon from '@mui/icons-material/DesignServices'
import PreviewIcon from '@mui/icons-material/Preview'
import TabContext from '@mui/lab/TabContext'
import TabList from '@mui/lab/TabList'
import TabPanel from '@mui/lab/TabPanel'
import { useEffect, useState } from 'react'
// material-ui
import groqIcon from '@/assets/images/robot.png'
import {
    Box,
    IconButton,
    Tab
} from '@mui/material'
import aiAssitant from './images/ai-assistant.png'
import chatGptImage from './images/chatgpt.png'
import inMemoryVectorStore from './images/in-memory.png'
import qdrantImage from './images/qdrant.png'
import './NodesList.css'
import nodesApi from '@/api/nodes'
import useApi from '@/hooks/useApi'

const iconMappig = (nodeName) => {
    if (nodeName === 'chatOpenAI' || nodeName === 'openAIEmbeddings') {
        return chatGptImage
    }
    if (nodeName === 'qdrant') {
        return qdrantImage
    }
    if (nodeName === 'conversationalRetrievalQAChain') {
        return aiAssitant
    }
    if (nodeName === 'memoryVectorStore') {
        return inMemoryVectorStore
    }
    return groqIcon
}

const formatCategoryName = (category) => {
    if (category === 'Chains') {
        return 'Persona'
    }
    return category
}

const formatNodeName = (name) => {
    if (name === 'conversationalRetrievalQAChain') {
        return 'Conversational Agent'
    }
    return name
}

export const NodesList = ({  isAgentCanvas, chatFlowId, setShowChat }) => {
    const filteredCategories = ['Vector Stores', 'Chat Models', 'Embeddings', 'Chains']
    const onDragStart = (event, node) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify(node))
        event.dataTransfer.effectAllowed = 'move'
    }

      const getNodesApi = useApi(nodesApi.getAllNodes)

    const [nodes, setNodes] = useState([])
    const [categories, setCategories] = useState([])
    const [menuValue, setMenuValue] = useState('1')
    const [showMenu, setShowMenu] = useState(true)
    const handleMenuChange = (event, newValue) => {
        setMenuValue(newValue)
    }
    useEffect(() => {
        if (getNodesApi.data) {
            const nodesListInput = getNodesApi.data
            const filteredNodes = nodesListInput.filter((node) => filteredCategories.includes(node.category))
            setNodes(filteredNodes)
            setCategories([...new Set(filteredNodes?.map((node) => node.category))])
        }
    }, [getNodesApi.data])
    const handleToggle = () => {
        setShowMenu((prev) => !prev)
        setShowChat((prev) => !prev)
    }
    useEffect(() => {
       getNodesApi.request()
     
       
    }, [])

    return (
        <div>
            <TabContext value={menuValue}>
                <Box className={showMenu ? 'menuContainer' : 'menuContainerChat'}>
                    {showMenu && (
                        <TabList onChange={handleMenuChange}>
                            {categories.map((category, index) => (
                                <Tab label={formatCategoryName(category)} value={formatCategoryName(category)} />
                            ))}
                        </TabList>
                    )}
                    <IconButton>
                        {showMenu ? <PreviewIcon onClick={handleToggle} /> : <DesignServicesIcon onClick={handleToggle} />}
                    </IconButton>
                </Box>
                {showMenu && (
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        {nodes.map((node, index) => (
                            <TabPanel onDragStart={(event) => onDragStart(event, node)} draggable value={formatCategoryName(node.category)}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                                    <img src={iconMappig(node.name)} width={50} height={50} />
                                    {formatNodeName(node.name)}
                                </div>
                            </TabPanel>
                        ))}
                    </div>
                )}
            </TabContext>
        </div>
    )
}

import { useState, useRef, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import PropTypes from 'prop-types'
import TabContext from '@mui/lab/TabContext'
import TabList from '@mui/lab/TabList'
import TabPanel from '@mui/lab/TabPanel'
import LocalLibraryIcon from '@mui/icons-material/LocalLibrary'
// material-ui
import { useTheme } from '@mui/material/styles'
import {
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Box,
    ClickAwayListener,
    Divider,
    InputAdornment,
    List,
    ListItemButton,
    ListItem,
    ListItemAvatar,
    ListItemText,
    OutlinedInput,
    Paper,
    Popper,
    Stack,
    Typography,
    Chip,
    Tab,
    Tabs,
    IconButton
} from '@mui/material'
import groqIcon from '@/assets/images/robot.png'
import qdrantImage from './images/qdrant.png'
import chatGptImage from './images/chatgpt.png'
import aiAssitant from './images/ai-assistant.png'
import inMemoryVectorStore from './images/in-memory.png'
import { ChatPopUp } from '../chatmessage/ChatPopUp'
 
const iconMappig = (nodeName) =>{
    if(nodeName === 'chatOpenAI' || nodeName === 'openAIEmbeddings'){
        return chatGptImage
    }
    if(nodeName === 'qdrant'){
        return qdrantImage
    }
    if(nodeName === 'conversationalRetrievalQAChain'){
        return aiAssitant
    }
    if(nodeName === 'memoryVectorStore'){
        return inMemoryVectorStore
    }
     return groqIcon;
}

const formatCategoryName = (category) => {  
    if(category === 'Chains'){
        return 'Persona'
    }
    return category;
}

const formatNodeName = (name) => {  

    if(name === 'conversationalRetrievalQAChain'){
        return 'Conversational Agent'
    }
    return name;
}

export const NodesList = ({ nodesListInput, isAgentCanvas, chatFlowId }) => {
    const filteredCategories = ['Vector Stores', 'Chat Models', 'Embeddings', 'Chains']
    const onDragStart = (event, node) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify(node))
        event.dataTransfer.effectAllowed = 'move'
    }
    const [nodes, setNodes] = useState([])
    const [categories, setCategories] = useState([])
    const [menuValue, setMenuValue] = useState('1')
    const handleMenuChange = (event, newValue) => {
        setMenuValue(newValue)
    }
    useEffect(() => {
        if (nodesListInput) {
            const filteredNodes = nodesListInput.filter((node) => filteredCategories.includes(node.category))
            setNodes(filteredNodes)
            setCategories([...new Set(filteredNodes?.map((node) => node.category))])
        }
    }, [nodesListInput])

    return (
        <div>
            <TabContext value={menuValue}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <TabList onChange={handleMenuChange} aria-label='lab API tabs example'>
                        {categories.map((category, index) => (
                            <Tab label={formatCategoryName(category)} value={formatCategoryName(category)} />
                        ))}
                    </TabList>
                    <IconButton style={{ paddingRight: 80}}>
        <ChatPopUp isAgentCanvas={isAgentCanvas} chatflowid={chatFlowId} />
      </IconButton>
                </Box>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                {nodes.map((node, index) => (
                   
                        <TabPanel onDragStart={(event) => onDragStart(event, node)} draggable value={formatCategoryName(node.category)}>
                            <div style={{ display: 'flex', flexDirection: 'column',  gap: 10, alignItems: 'center' }}>
                            <img src={iconMappig(node.name)} width={50} height={50} />
                            {formatNodeName(node.name)}
                           </div> 
                        </TabPanel>
                  
                ))}
                  </div>
            
            </TabContext>
        </div>
    )
}

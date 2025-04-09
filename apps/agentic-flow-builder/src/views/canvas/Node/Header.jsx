
import { AppBar, Box, Button, Fab, Toolbar } from '@mui/material'
import aiAssitant from '../images/ai-assistant.png'
import chatGptImage from '../images/chatgpt.png'
import inMemoryVectorStore from '../images/in-memory.png'
import qdrantImage from '../images/qdrant.png'

const mapCategoryNaming = (category) => { 
    if(category.toLowerCase() === 'vector stores') {
        return 'Knowledge Base'
    }

    return category;
  }

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
  
export const NodeHeader = ({ data }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <Box>
            <img src={iconMappig(data.name)} width={50} height={50} />
                <div
                    style={{
                        padding: 10,
                        fontWeight: 900,
                        backgroundColor: 'white',
                        cursor: 'grab'
                    }}
                >
                    {mapCategoryNaming(data.category)} - {data.label}
                </div>
            </Box>

            {data.tags && data.tags.includes('LlamaIndex') && (
                <>
                    <div
                        style={{
                            borderRadius: '50%',
                            padding: 15
                        }}
                    >
                        <img
                            style={{ width: '25px', height: '25px', borderRadius: '50%', objectFit: 'contain' }}
                            src={LlamaindexPNG}
                            alt='LlamaIndex'
                        />
                    </div>
                </>
            )}
            
        </div>
    )
}

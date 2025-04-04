import PropTypes from 'prop-types'
import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

// material-ui
import { Box, ButtonBase, Stack, TextField, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// icons
import { IconCheck, IconChevronLeft, IconDeviceFloppy, IconPencil, IconX } from '@tabler/icons-react'


import SaveChatflowDialog from '@/ui-component/dialog/SaveChatflowDialog'


// API
import chatflowsApi from '@/api/chatflows'

// Hooks
import useApi from '@/hooks/useApi'

// utils
import { SET_CHATFLOW } from '@/store/actions'

// ==============================|| CANVAS HEADER ||============================== //

const CanvasHeader = ({ chatflow, isAgentCanvas, handleSaveFlow, handleDeleteFlow, handleLoadFlow }) => {
    const theme = useTheme()
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const flowNameRef = useRef()


    const [isEditingFlowName, setEditingFlowName] = useState(null)
    const [flowName, setFlowName] = useState('')
    const [flowDialogOpen, setFlowDialogOpen] = useState(false)
    

    const title = isAgentCanvas ? 'Agentic' : 'Chatflow'

    const updateChatflowApi = useApi(chatflowsApi.updateChatflow)
    const canvas = useSelector((state) => state.canvas)

    const onUploadFile = (file) => {
        setSettingsOpen(false)
        handleLoadFlow(file)
    }

    const submitFlowName = () => {
        if (chatflow.id) {
            const updateBody = {
                name: flowNameRef.current.value
            }
            updateChatflowApi.request(chatflow.id, updateBody)
        }
    }

    const onSaveChatflowClick = () => {
        if (chatflow.id) handleSaveFlow(flowName)
        else setFlowDialogOpen(true)
    }

    const onConfirmSaveName = (flowName) => {
        setFlowDialogOpen(false)
        handleSaveFlow(flowName)
    }

    useEffect(() => {
        if (updateChatflowApi.data) {
            setFlowName(updateChatflowApi.data.name)
            dispatch({ type: SET_CHATFLOW, chatflow: updateChatflowApi.data })
        }
        setEditingFlowName(false)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [updateChatflowApi.data])

    useEffect(() => {
        if (chatflow) {
            setFlowName(chatflow.name)
          
        }
    }, [chatflow, title])

    return (
        <>
            <Stack flexDirection='row' justifyContent='space-between' sx={{ width: '100%' }}>
                <Stack flexDirection='row' sx={{ width: '100%', maxWidth: '50%' }}>
                    <Box>
                        <ButtonBase title='Back' sx={{ borderRadius: '50%' }}>
                            <IconChevronLeft
                                onClick={() =>
                                    window.history.state && window.history.state.idx > 0 ? navigate(-1) : navigate('/', { replace: true })
                                }
                            />
                        </ButtonBase>
                    </Box>
                    <Box sx={{ width: '100%' }}>
                        {!isEditingFlowName ? (
                            <Stack flexDirection='row'>
                                <Typography
                                    sx={{
                                        fontSize: '1.5rem',
                                        fontWeight: 600,
                                        ml: 2,
                                        textOverflow: 'ellipsis',
                                        overflow: 'hidden',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {canvas.isDirty && <strong style={{ color: theme.palette.orange.main }}>*</strong>} {flowName}
                                </Typography>
                                {chatflow?.id && (
                                    <ButtonBase title='Edit Name' sx={{ borderRadius: '50%' }}>
                                        <IconPencil onClick={() => setEditingFlowName(true)} />
                                    </ButtonBase>
                                )}
                            </Stack>
                        ) : (
                            <Stack flexDirection='row' sx={{ width: '100%' }}>
                                <TextField
                                    //eslint-disable-next-line jsx-a11y/no-autofocus
                                    autoFocus
                                    size='small'
                                    inputRef={flowNameRef}
                                    sx={{
                                        width: '100%',
                                        ml: 2
                                    }}
                                    defaultValue={flowName}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            submitFlowName()
                                        } else if (e.key === 'Escape') {
                                            setEditingFlowName(false)
                                        }
                                    }}
                                />
                                <ButtonBase title='Save Name'>
                                    <IconCheck onClick={submitFlowName} />
                                </ButtonBase>
                                <ButtonBase title='Cancel'>
                                    <IconX onClick={() => setEditingFlowName(false)} />
                                </ButtonBase>
                            </Stack>
                        )}
                    </Box>
                </Stack>
                <Box>
                    <ButtonBase title={`Save ${title}`} sx={{ borderRadius: '50%', mr: 2 }}>
                        <IconDeviceFloppy onClick={onSaveChatflowClick} />
                    </ButtonBase>
                </Box>
            </Stack>

            <SaveChatflowDialog
                show={flowDialogOpen}
                dialogProps={{
                    title: `Save New ${title}`,
                    confirmButtonName: 'Save',
                    cancelButtonName: 'Cancel'
                }}
                onCancel={() => setFlowDialogOpen(false)}
                onConfirm={onConfirmSaveName}
            />
        </>
    )
}

CanvasHeader.propTypes = {
    chatflow: PropTypes.object,
    handleSaveFlow: PropTypes.func,
    handleDeleteFlow: PropTypes.func,
    handleLoadFlow: PropTypes.func,
    isAgentCanvas: PropTypes.bool
}

export default CanvasHeader

import PropTypes from 'prop-types'
import { useContext, useState } from 'react'
import { useSelector } from 'react-redux'

import { Box, IconButton } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import NodeCardWrapper from '@/ui-component/cards/NodeCardWrapper'
import AdditionalParamsDialog from '@/ui-component/dialog/AdditionalParamsDialog'
import NodeTooltip from '@/ui-component/tooltip/NodeTooltip'

import { flowContext } from '@/store/context/ReactFlowContext'
import { IconTrash } from '@tabler/icons-react'
import { NodeHeader } from './Header'
import { NodeInput } from './NodeInput'
import { NodeOutput } from './NodeOutput'

// ===========================|| CANVAS NODE ||=========================== //

const CanvasNode = ({ data }) => {
    const theme = useTheme()
    const canvas = useSelector((state) => state.canvas)
    const { deleteNode } = useContext(flowContext)

    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})
    const [open, setOpen] = useState(false)
    const [isForceCloseNodeInfo, setIsForceCloseNodeInfo] = useState(null)

    const handleClose = () => {
        setOpen(false)
    }

    const handleOpen = () => {
        setOpen(true)
    }

    const getNodeInfoOpenStatus = () => {
        if (isForceCloseNodeInfo) return false
        else return !canvas.canvasDialogShow && open
    }

    const onDialogClicked = () => {
        const dialogProps = {
            data,
            inputParams: data.inputParams.filter((inputParam) => !inputParam.hidden).filter((param) => param.additionalParams),
            confirmButtonName: 'Save',
            cancelButtonName: 'Cancel'
        }
        setDialogProps(dialogProps)
        setShowDialog(true)
    }

    return (
        <>
            <NodeCardWrapper>
                <NodeTooltip
                    open={getNodeInfoOpenStatus()}
                    onClose={handleClose}
                    onOpen={handleOpen}
                    disableFocusListener={true}
                    title={
                        <IconButton
                            title='Delete'
                            onClick={() => {
                                deleteNode(data.id)
                            }}
                            sx={{ height: '35px', width: '35px', '&:hover': { color: 'red' } }}
                            color={theme?.customization?.isDarkMode ? theme.colors?.paper : 'inherit'}
                        >
                            <IconTrash />
                        </IconButton>
                    }
                    placement='right-start'
                >
                    <Box>
                        <NodeHeader data={data} />
                        <NodeInput data={data} onDialogClicked={onDialogClicked} />
                        <NodeOutput data={data} />
                    </Box>
                </NodeTooltip>
            </NodeCardWrapper>
            <AdditionalParamsDialog
                show={showDialog}
                dialogProps={dialogProps}
                onCancel={() => setShowDialog(false)}
            ></AdditionalParamsDialog>
        </>
    )
}

CanvasNode.propTypes = {
    data: PropTypes.object
}

export default CanvasNode

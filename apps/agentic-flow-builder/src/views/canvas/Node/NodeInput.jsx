import { Box, Button, Divider, Typography } from "@mui/material"
import NodeInputHandler from "../NodeInputHandler"

export const NodeInput = ({ data, onDialogClicked }) => {
    return (
        <div >
            {(data.inputAnchors.length > 0 || data.inputParams.length > 0) && (
                <>
                    <Divider />
                    <Box >
                        <Typography
                            sx={{
                                fontWeight: 500,
                                textAlign: 'center'
                            }}
                        >
                            Inputs
                        </Typography>
                    </Box>
                    <Divider />
                </>
            )}
            {data.inputAnchors.map((inputAnchor, index) => (
                <NodeInputHandler key={index} inputAnchor={inputAnchor} data={data} />
            ))}
            {data.inputParams
                .filter((inputParam) => !inputParam.hidden)
                .map((inputParam, index) => (
                    <NodeInputHandler
                        key={index}
                        inputParam={inputParam}
                        data={data}
                        onHideNodeInfoDialog={(status) => {
                            if (status) {
                                setIsForceCloseNodeInfo(true)
                            } else {
                                setIsForceCloseNodeInfo(null)
                            }
                        }}
                    />
                ))}
            {data.inputParams.find((param) => param.additionalParams) && (
                <div
                    style={{
                        textAlign: 'center',
                        marginTop:
                            data.inputParams.filter((param) => param.additionalParams).length ===
                            data.inputParams.length + data.inputAnchors.length
                                ? 20
                                : 0
                    }}
                >
                    <Button sx={{ borderRadius: 25, width: '90%', mb: 2 }} variant='outlined' onClick={onDialogClicked}>
                        Additional Parameters
                    </Button>
                </div>
            )}
        </div>
    )
}

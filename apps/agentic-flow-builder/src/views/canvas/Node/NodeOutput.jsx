import NodeOutputHandler from "../NodeOutputHandler"
import { Divider } from "@mui/material"
import { AppBar, Box, Button, Fab, Toolbar, Typography } from '@mui/material'

export const NodeOutput = ({ data }) => {
    return (
        <>
            {data.outputAnchors.length > 0 && <Divider />}
            {data.outputAnchors.length > 0 && (
                <Box >
                    <Typography
                        sx={{
                            fontWeight: 500,
                            textAlign: 'center'
                        }}
                    >
                        Output
                    </Typography>
                </Box>
            )}
            {data.outputAnchors.length > 0 && <Divider />}
            {data.outputAnchors.length > 0 &&
                data.outputAnchors.map((outputAnchor) => (
                    <NodeOutputHandler key={JSON.stringify(data)} outputAnchor={outputAnchor} data={data} />
                ))}
        </>
    )
}

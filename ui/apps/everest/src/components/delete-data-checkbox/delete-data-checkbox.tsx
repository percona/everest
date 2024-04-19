import { Box, FormControlLabel, Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { CheckboxInput } from '@percona/ui-lib';
import { Messages } from './delete-data-checkbox.messages';
import { DeleteDataCheckboxProps } from './delete-data-checkbox.types';

export const DeleteDataCheckbox = ({
  formControlLabelProps,
}: DeleteDataCheckboxProps) => (
  <FormControlLabel
    {...formControlLabelProps}
    label={
      <Box display="flex" mt={0}>
        {Messages.deleteData}
        <Tooltip
          title={Messages.tooltip}
          arrow
          placement="right"
          sx={{ ml: 1 }}
        >
          <InfoOutlinedIcon />
        </Tooltip>
      </Box>
    }
    control={<CheckboxInput name="cleanupBackupStorage" />}
  />
);

export default DeleteDataCheckbox;

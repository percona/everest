import { Button, Typography } from '@mui/material';
import { FormDialog } from 'components/form-dialog';
import { ReactNode, useState } from 'react';
import { Messages } from '../messages';
import { useFormContext, useWatch } from 'react-hook-form';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { z, ZodTypeDef } from 'zod';

export type SectionFormWithStatusProps = {
  sectionSavedKey: string;
  children: ReactNode;
  dialogTitle: string;
  schema: z.Schema<unknown, ZodTypeDef>;
};

const SectionFormWithStatus = ({
  sectionSavedKey,
  children,
  dialogTitle,
  schema,
}: SectionFormWithStatusProps) => {
  const [openDialog, setOpenDialog] = useState(false);
  const { setValue, control, getValues } = useFormContext();
  const isSectionSaved = useWatch({ control, name: sectionSavedKey });

  return (
    <>
      <Button onClick={() => setOpenDialog(true)}>
        {isSectionSaved ? (
          <EditOutlinedIcon />
        ) : (
          <Typography>{Messages.fillDetails}</Typography>
        )}
      </Button>
      <FormDialog
        defaultValues={getValues()}
        isOpen={openDialog}
        closeModal={() => setOpenDialog(false)}
        headerMessage={dialogTitle}
        onSubmit={(data) => {
          setValue(sectionSavedKey, true);
          Object.entries(data).forEach(([key, value]) => {
            setValue(key, value);
          });
          setOpenDialog(false);
        }}
        schema={schema}
        submitMessage="Save"
      >
        {children}
      </FormDialog>
    </>
  );
};

export default SectionFormWithStatus;

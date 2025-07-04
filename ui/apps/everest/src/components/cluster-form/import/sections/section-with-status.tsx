import { Button, Typography } from '@mui/material';
import { FormDialog } from 'components/form-dialog';
import { ReactNode, useState } from 'react';
import { Messages } from '../messages';
import {
  useFormContext,
  useWatch,
  useForm,
  FormProvider,
} from 'react-hook-form';
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
  const { setValue, control, getValues, trigger } = useFormContext();
  const isSectionSaved = useWatch({ control, name: sectionSavedKey });
  const methods = useForm({});

  const handleOpenDialog = () => {
    methods.reset(getValues());
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleSubmit = (data: Record<string, unknown>) => {
    setValue(sectionSavedKey, true);
    Object.entries(data).forEach(([key, value]) => {
      setValue(key, value);
    });
    setOpenDialog(false);
    trigger();
  };

  return (
    <>
      <Button onClick={handleOpenDialog}>
        {isSectionSaved ? (
          <EditOutlinedIcon />
        ) : (
          <Typography>{Messages.fillDetails}</Typography>
        )}
      </Button>
      {openDialog && (
        <FormProvider {...methods}>
          <FormDialog
            defaultValues={methods.getValues()}
            isOpen={openDialog}
            closeModal={handleCloseDialog}
            headerMessage={dialogTitle}
            onSubmit={handleSubmit}
            schema={schema}
            submitMessage="Save"
          >
            {children}
          </FormDialog>
        </FormProvider>
      )}
    </>
  );
};

export default SectionFormWithStatus;

import React from 'react';
import { Typography, Box } from '@mui/material';
import RoundedBox from 'components/rounded-box';
import { SuccessIcon } from '@percona/ui-lib';
import { useFormContext } from 'react-hook-form';

const Header = ({
  title,
  controlComponent,
}: {
  title: string;
  controlComponent: React.ReactNode;
}) => (
  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
    <Typography variant="sectionHeading">{title}</Typography>
    <Box
      sx={{
        flexBasis: '20%',
        maxWidth: '40%',
        textAlign: 'right',
      }}
    >
      {controlComponent}
    </Box>
  </Box>
);

type FormCardProps = {
  title: string;
  description?: string | React.ReactNode;
  controlComponent: React.ReactNode;
};

const FormCard: React.FC<FormCardProps> = ({
  title,
  description = '',
  controlComponent,
}) => {
  return (
    <RoundedBox
      title={<Header title={title} controlComponent={controlComponent} />}
    >
      {typeof description === 'string' ? (
        <Typography variant="caption">{description}</Typography>
      ) : (
        description
      )}
    </RoundedBox>
  );
};

type FormCardWithCheckProps = {
  title: string;
  description?: string | React.ReactNode;
  controlComponent: React.JSX.Element;
};

const FormCardWithCheck: React.FC<FormCardWithCheckProps> = ({
  title,
  description = '',
  controlComponent,
}) => {
  const { getValues } = useFormContext();

  const fieldValue = getValues(controlComponent!.props?.name);
  return (
    <RoundedBox
      title={<Header title={title} controlComponent={controlComponent} />}
    >
      {fieldValue && <SuccessIcon size="large" />}
      {typeof description === 'string' ? (
        <Typography variant="caption">{description}</Typography>
      ) : (
        description
      )}
    </RoundedBox>
  );
};

type FormCardWithDialogProps = {
  title: string;
  content: React.ReactNode;
  optional?: boolean;
};

const FormCardWithDialog: React.FC<FormCardWithDialogProps> = ({
  title,
  content,
  optional = false,
}) => {
  return (
    <Box
      className="percona-rounded-box"
      sx={{
        marginTop: 1,
        p: 2,
        borderStyle: 'solid',
        borderWidth: '1px',
        borderColor: (theme) => theme.palette.divider,
        borderRadius: 2,
        display: 'flex',
        justifyContent: 'space-between',
      }}
    >
      <Typography variant="sectionHeading" sx={{ padding: '6px 8px' }}>
        {title}{' '}
        {optional && <Typography variant="caption">(optional)</Typography>}
      </Typography>
      {content}
    </Box>
  );
};

export { FormCard, FormCardWithCheck, FormCardWithDialog };

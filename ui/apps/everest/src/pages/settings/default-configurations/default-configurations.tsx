import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Stack, Typography } from '@mui/material';
import { TextArray } from '@percona/ui-lib';
import {
  FormProvider,
  SubmitHandler,
  useForm,
  useWatch,
} from 'react-hook-form';
import { SwitchOutlinedBox } from 'components/switch-outlined-box/switch-oulined-box';
import { TimeSelection } from 'components/time-selection/time-selection';
import {
  AmPM,
  TimeValue,
  WeekDays,
} from 'components/time-selection/time-selection.types';
import { useActiveBreakpoint } from 'hooks/utils/useActiveBreakpoint';
import { Messages } from './default-configurations.messages';
import {
  DefaultConfigurationsFields,
  defaultConfigurationsSchema,
  DefaultConfigurationsType,
} from './default-configurations.types';

export const DefaultConfigurations = () => {
  const { isTablet } = useActiveBreakpoint();

  const methods = useForm<DefaultConfigurationsType>({
    mode: 'onChange',
    resolver: zodResolver(defaultConfigurationsSchema),
    defaultValues: {
      // TODO get from api =>
      // TODO CRON for api should be used as getCronExpressionFromFormValues({selectedTime, minute, hour, amPm, onDay, weekDay})
      [DefaultConfigurationsFields.monitoring]: false,
      [DefaultConfigurationsFields.backupsEnabled]: false,
      [DefaultConfigurationsFields.externalAccess]: false,
      [DefaultConfigurationsFields.selectedTime]: TimeValue.hours,
      [DefaultConfigurationsFields.minute]: 0,
      [DefaultConfigurationsFields.hour]: 12,
      [DefaultConfigurationsFields.amPm]: AmPM.AM,
      [DefaultConfigurationsFields.weekDay]: WeekDays.Mo,
      [DefaultConfigurationsFields.onDay]: 1,
      [DefaultConfigurationsFields.sourceRanges]: [
        { sourceRange: '181.170.213.40/32' },
        { sourceRange: '181.170.213.40/31' },
      ],
    },
  });

  const [backupsEnabled, externalAccess] = useWatch({
    control: methods.control,
    name: [
      DefaultConfigurationsFields.backupsEnabled,
      DefaultConfigurationsFields.externalAccess,
    ],
  });

  const onSubmit: SubmitHandler<DefaultConfigurationsType> = (data) => {
    console.log(data);
  };

  return (
    <div>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <Stack>
            <Typography
              data-testid="default-configurations-info"
              sx={{ mt: 2, mx: 1 }}
              variant="body1"
            >
              {Messages.pageDescription}
            </Typography>

            <SwitchOutlinedBox
              name={DefaultConfigurationsFields.monitoring}
              control={methods.control}
              label={Messages.monitoring}
              labelCaption={Messages.monitoringMessage}
            />
            <SwitchOutlinedBox
              name={DefaultConfigurationsFields.backupsEnabled}
              control={methods.control}
              label={Messages.backups}
              labelCaption={Messages.backupsMessage}
              childrenSx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                ...(isTablet && {
                  justifyContent: 'start',
                  pl: '55px',
                  flexWrap: 'wrap',
                }),
              }}
            >
              {backupsEnabled && (
                <>
                  <Typography
                    sx={{ whiteSpace: 'pre' }}
                    variant="sectionHeading"
                  >
                    {Messages.repeatsEvery}
                  </Typography>
                  <TimeSelection
                    sx={{
                      flexWrap: 'nowrap',
                      ...(isTablet && { flexWrap: 'wrap' }),
                    }}
                    sxTimeFields={{
                      flexWrap: 'nowrap',
                      ...(isTablet && { flexWrap: 'wrap' }),
                    }}
                  />
                </>
              )}
            </SwitchOutlinedBox>
            <SwitchOutlinedBox
              name={DefaultConfigurationsFields.externalAccess}
              control={methods.control}
              label={Messages.externalAccess}
              labelCaption={Messages.externalAccessMessage}
              childrenSx={{
                flexDirection: 'column',
                display: 'flex',
                justifyContent: 'end',
                ...(isTablet && {
                  justifyContent: 'start',
                  pl: '55px',
                  flexWrap: 'wrap',
                  flex: '1 1 auto',
                }),
              }}
            >
              {externalAccess && (
                <TextArray
                  fieldName={DefaultConfigurationsFields.sourceRanges}
                  fieldKey="sourceRange"
                />
              )}
            </SwitchOutlinedBox>
            <Stack direction="row" justifyContent="flex-end" mt={2} gap={1}>
              <Button onClick={() => {}} variant="text">
                {Messages.cancel}
              </Button>
              <Button
                onClick={methods.handleSubmit(onSubmit)}
                variant="contained"
              >
                {Messages.save}
              </Button>
            </Stack>
          </Stack>
        </form>
      </FormProvider>
    </div>
  );
};

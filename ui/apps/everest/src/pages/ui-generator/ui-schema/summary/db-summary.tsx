import { Drawer, Toolbar, Box, Typography, IconButton } from '@mui/material';
import { FieldValues, useFormContext, useWatch } from 'react-hook-form';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useMemo } from 'react';
import { ComponentProperties, OpenAPIFields } from '../types';

type DatabaseSummaryProps = {
  fields: OpenAPIFields;
  setActiveStep: (step: number) => void;
};
type SummarySectionItems = {
  label: string;
  value: string | number | boolean;
  subSection?: boolean;
}[];

type SummarySection = {
  title: string;
  items: SummarySectionItems;
  stepIdx: number;
};

function extractSectionItems(
  component: ComponentProperties,
  values: FieldValues,
  isSubSection = false
): SummarySectionItems {
  const result: SummarySectionItems = [];
  Object.entries(component).forEach(([key, val]) => {
    if (typeof val === 'object' && val !== null) {
      if (val.uiType === 'Group' && val.subParameters) {
        result.push(
          ...extractSectionItems(val.subParameters, values[key] ?? {}, true)
        );
      } else if (val.uiType !== 'Hidden') {
        const label = val.params?.label || val.label || key;
        let value = values[key];
        value = value === undefined || value === null ? '' : String(value);
        result.push({ label, value, subSection: isSubSection });
      }
    }
  });
  return result;
}

const getSummarySections = (fields: OpenAPIFields, values: FieldValues) => {
  const sections: SummarySection[] = [];

  if (values.topology) {
    const selectedTopology = values.topology.type || '';
    sections.push({
      title: '1. Topology',
      items: [
        { label: 'Type', value: selectedTopology },
        ...(selectedTopology
          ? Object.entries(fields.topology[selectedTopology]).map(
              ([name, properties]) => ({
                label: properties?.label || name,
                value: values.topology[selectedTopology][name],
              })
            )
          : []),
      ],
      stepIdx: 0,
    });
  }

  if (fields.global) {
    sections.push({
      title: '2. Global',
      items: extractSectionItems(fields.global, values.global?.params ?? {}),
      stepIdx: 1,
    });
  }

  if (fields.components) {
    Object.entries(fields.components).forEach(([compKey, compObj], compIdx) => {
      sections.push({
        title: `${compIdx + 3}. Component: ${compKey}`,
        items: extractSectionItems(compObj, values.components?.[compKey] ?? {}),
        stepIdx: 2 + compIdx,
      });
    });
  }
  return sections;
};

export const DatabaseSummary = ({
  fields,
  setActiveStep,
}: DatabaseSummaryProps) => {
  const { getValues } = useFormContext();
  const values = getValues();
  useWatch();

  const summarySections = useMemo(
    () => getSummarySections(fields, values),
    [fields, values]
  );

  return (
    <Drawer
      variant="permanent"
      anchor="right"
      sx={{
        width: (theme) => `calc(25vw - ${theme.spacing(4)})`,
        flexShrink: 0,
        ml: 3,
        [`& .MuiDrawer-paper`]: {
          width: '25%',
          boxSizing: 'border-box',
        },
      }}
    >
      <Toolbar />
      <Box sx={{ p: 2 }}>
        {summarySections.map((section) => (
          <Box key={section.title} mb={2}>
            <Box display="flex" alignItems="center" mb={1}>
              <Typography variant="h6" sx={{ mr: 1 }}>
                {section.title}
              </Typography>
              <IconButton
                color="primary"
                size="small"
                onClick={() => setActiveStep(section.stepIdx)}
              >
                <EditOutlinedIcon
                  sx={{
                    verticalAlign: 'text-bottom',
                  }}
                />
              </IconButton>
            </Box>
            {section.items.map((item, itemIdx) => (
              <Typography key={item.label + itemIdx} variant="body2">
                {item.label}: {item.value}
              </Typography>
            ))}
          </Box>
        ))}
      </Box>
    </Drawer>
  );
};

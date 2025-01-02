// everest
// Copyright (C) 2023 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { ArrowOutward } from '@mui/icons-material';
import { Box, Button, Typography } from '@mui/material';
import { useContext, useEffect } from 'react';
import { AffinityPriority } from 'shared-types/affinity.types';
import { Messages } from '../../../advanced-configuration/affinity/affinity-form.messages';
import { AffinityFormDialogContext } from '../affinity-form-dialog-context/affinity-form-context';
import { AffinityFormFields } from './affinity-form.types';
import { useFormContext } from 'react-hook-form';
import { RuleDetailsSection, RuleTypeSection } from './sections';

export const AffinityForm = () => {
  const {
    mode = 'new',
    dbType,
    isShardingEnabled,
  } = useContext(AffinityFormDialogContext);
  const { watch, resetField, trigger } = useFormContext();
  const [operator, key, priority, type] = watch([
    AffinityFormFields.operator,
    AffinityFormFields.key,
    AffinityFormFields.priority,
    AffinityFormFields.type,
  ]);

  useEffect(() => {
    resetField(AffinityFormFields.weight, {
      keepError: false,
    });
  }, [priority, resetField]);

  useEffect(() => {
    trigger();
  }, [type, trigger]);

  return (
    <>
      <Box sx={{ display: 'flex' }}>
        <Typography variant="body2">
          {Messages.description}
          <Button
            data-testid="learn-more-button"
            size="small"
            sx={{ fontWeight: '600', paddingTop: 0 }}
            onClick={() => {
              window.open(
                'https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#affinity-and-anti-affinity',
                '_blank',
                'noopener'
              );
            }}
            endIcon={<ArrowOutward />}
          >
            {Messages.learnMore}
          </Button>
        </Typography>
      </Box>
      <RuleTypeSection
        dbType={dbType}
        isShardingEnabled={isShardingEnabled}
        disableComponent={mode === 'edit'}
        showWeight={priority === AffinityPriority.Preferred}
      />
      <RuleDetailsSection
        operator={operator}
        disableOperator={!key}
        disableValue={!key}
      />
    </>
  );
};

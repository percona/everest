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

import { Box, Typography } from '@mui/material';
import { useEffect } from 'react';
import { AffinityPriority, AffinityType } from 'shared-types/affinity.types';
import { AffinityFormFields } from './affinity-form.types';
import { useFormContext } from 'react-hook-form';
import { RuleDetailsSection, RuleTypeSection } from './sections';
import { DbType } from '@percona/types';

type Props = {
  dbType: DbType;
};

export const AffinityForm = ({ dbType }: Props) => {
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
          Create a new affinity rule to control how your database workloads are
          allocated across your system. Use this rule to enhance performance,
          improve resource management, or ensure high availability based on your
          deployment needs.
        </Typography>
      </Box>
      <RuleTypeSection
        dbType={dbType}
        // disableComponent={selectedAffinityUid !== null}
        showWeight={priority === AffinityPriority.Preferred}
      />
      <RuleDetailsSection
        showTopologyKey={type !== AffinityType.NodeAffinity}
        operator={operator}
        disableOperator={!key}
        disableValue={!key}
        affinityType={type}
      />
    </>
  );
};

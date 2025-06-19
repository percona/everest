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
import {
  GetDbEnginePayload,
  GetDbEnginesPayload,
  OperatorsUpgradePlan,
} from 'shared-types/dbEngines.types';
import { api } from './api';

export const getDbEnginesFn = async (namespace: string) => {
  const response = await api.get<GetDbEnginesPayload>(
    `/namespaces/${namespace}/database-engines`
  );

  return response.data;
};

export const getDbEngineFn = async (namespace: string, name: string) => {
  const response = await api.get<GetDbEnginePayload>(
    `/namespaces/${namespace}/database-engines/${name}`
  );

  return response.data;
};

export const upgradeOperator = async (namespace: string) => {
  const response = await api.post(
    `/namespaces/${namespace}/database-engines/upgrade-plan/approval/`,
    {}
  );

  return response.data;
};

export const getOperatorsUpgradePlan = async (namespace: string) =>
  (
    await api.get<OperatorsUpgradePlan>(
      `/namespaces/${namespace}/database-engines/upgrade-plan`
    )
  ).data;

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

import { DbEngineType } from '@percona/types';

export type AnnotationType = {
  [key: string]: string;
};

export interface LoadBalancerConfigList {
  apiVersion: string;
  kind: string;
  items: LoadBalancerConfig[];
  metadata: { resourceVersion?: string; name: string; finalizers?: string[] };
}

export interface LoadBalancerConfig {
  apiVersion: string;
  kind: string;
  metadata: { resourceVersion?: string; name: string; finalizers?: string[] };
  spec: {
    annotations?: AnnotationType;
    engineType?: DbEngineType;
  };
  status?: {
    inUse?: boolean;
    lastObservedGeneration?: number;
  };
}

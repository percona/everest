import { paths } from '@generatedTypes';

export type CreateDatabaseClusterRequest = paths['/namespaces/{namespace}/database-clusters']['post']['requestBody']['content']['application/json'];
export type CreateDatabaseClusterResponse = paths['/namespaces/{namespace}/database-clusters']['post']['responses']['200']['content']['application/json'];
export type GetDatabaseClusterResponse = paths['/namespaces/{namespace}/database-clusters']['get']['responses']['200']['content']['application/json'];
export type GetDatabaseClusterComponentsResponse = paths['/namespaces/{namespace}/database-clusters/{name}/components']['get']['responses']['200']['content']['application/json'];

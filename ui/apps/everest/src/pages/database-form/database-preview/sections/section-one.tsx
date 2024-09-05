import { beautifyDbTypeName } from '@percona/utils';
import { PreviewContentText } from '../preview-section';
import { SectionProps } from './section.types';
import { DbType } from '@percona/types';

export const PreviewSectionOne = ({
  dbName,
  dbVersion,
  dbType,
  storageClass,
  k8sNamespace,
  sharding,
}: SectionProps) => (
  <>
    <PreviewContentText text={`Namespace: ${k8sNamespace}`} />
    <PreviewContentText text={`Type: ${beautifyDbTypeName(dbType)}`} />
    <PreviewContentText text={`Name: ${dbName}`} />
    <PreviewContentText text={`Version: ${dbVersion}`} />
    <PreviewContentText text={`Storage class: ${storageClass ?? ''}`} />
    {dbType === DbType.Mongo && (
      <PreviewContentText
        text={`Sharding: ${sharding ? 'enabled' : 'disabled'}`}
      />
    )}
  </>
);

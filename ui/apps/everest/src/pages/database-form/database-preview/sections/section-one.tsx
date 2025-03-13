import { beautifyDbTypeName } from '@percona/utils';
import { PreviewContentText } from '../preview-section';
import { SectionProps } from './section.types';
import { DbType } from '@percona/types';

export const PreviewSectionOne = ({
  dbName,
  dbVersion,
  dbType,
  k8sNamespace,
  sharding,
}: SectionProps) => (
  <>
    <PreviewContentText text={`Namespace: ${k8sNamespace}`} />
    <PreviewContentText text={`Type: ${beautifyDbTypeName(dbType)}`} />
    <PreviewContentText text={`Name: ${dbName}`} />
    <PreviewContentText text={`Version: ${dbVersion}`} />
    {dbType === DbType.Mongo && (
      <PreviewContentText
        text={`Sharding: ${sharding ? 'enabled' : 'disabled'}`}
      />
    )}
  </>
);

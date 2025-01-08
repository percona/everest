package api

import "github.com/percona/everest-operator/api/v1alpha1"

func (out *BackupStorage) FromCR(in *v1alpha1.BackupStorage) {
	out.Type = BackupStorageType(in.Spec.Type)
	out.Name = in.GetName()
	out.Namespace = in.GetNamespace()
	out.Description = &in.Spec.Description
	out.BucketName = in.Spec.Bucket
	out.Region = in.Spec.Region
	out.Url = &in.Spec.EndpointURL
	out.VerifyTLS = in.Spec.VerifyTLS
	out.ForcePathStyle = in.Spec.ForcePathStyle
}

func (out *MonitoringInstance) FromCR(in *v1alpha1.MonitoringConfig) {
	out.Name = in.GetName()
	out.Namespace = in.GetNamespace()
	out.Url = in.Spec.PMM.URL
	out.AllowedNamespaces = &in.Spec.AllowedNamespaces
	out.VerifyTLS = in.Spec.VerifyTLS
	out.Type = MonitoringInstanceBaseWithNameType(in.Spec.Type)
}

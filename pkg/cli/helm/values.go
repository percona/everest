package helm

import "github.com/percona/everest/pkg/kubernetes"

// EverestValues contains the different values that can be set in the Helm chart.
type EverestValues struct {
	ClusterType        kubernetes.ClusterType
	VersionMetadataURL string
}

// NewEverestValues returns the values to be used in the Helm chart.
func NewEverestValues(v EverestValues) map[string]interface{} {
	values := map[string]interface{}{}
	if v.ClusterType == kubernetes.ClusterTypeOpenShift {
		values["compatibility.openshift"] = true
	}
	if v.VersionMetadataURL != "" {
		values["versionMetadataURL"] = v.VersionMetadataURL
	}
	return values
}

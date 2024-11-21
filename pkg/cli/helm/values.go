package helm

import "github.com/percona/everest/pkg/kubernetes"

// Values contains the different values that can be set in the Helm chart.
type Values struct {
	ClusterType        kubernetes.ClusterType
	VersionMetadataURL string
}

// NewValues creates a map of values that can be used to render the Helm chart.
func NewValues(v Values) map[string]interface{} {
	values := make(map[string]interface{})
	if v.ClusterType == kubernetes.ClusterTypeOpenShift {
		values["compatibility.openshift"] = true
	}
	if v.VersionMetadataURL != "" {
		values["versionMetadataURL"] = v.VersionMetadataURL
	}
	return values
}

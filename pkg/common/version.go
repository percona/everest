package common

import (
	"errors"
	"fmt"

	versionpb "github.com/Percona-Lab/percona-version-service/versionpb"
	goversion "github.com/hashicorp/go-version"
	"go.uber.org/zap"
	k8sVersion "k8s.io/apimachinery/pkg/version"
)

// SupportedVersion provides a list of contraints per component.
type SupportedVersion struct {
	Catalog       goversion.Constraints
	Cli           goversion.Constraints
	Kubernetes    goversion.Constraints
	Olm           goversion.Constraints
	PGOperator    goversion.Constraints
	PXCOperator   goversion.Constraints
	PSMBDOperator goversion.Constraints
}

type version interface {
	string | *goversion.Version
}

type serverVersionGetter interface {
	GetServerVersion() (*k8sVersion.Info, error)
}

// CompareVersions compares two versions.
// Returns:
// -1 if v1 < v2
// 0 if v1 == v2
// 1 if v1 > v2
//
// Arguments can be passed either as string or *goversion.Version,
// otherwise this function will panic.
func CompareVersions[T1, T2 version](v1 T1, v2 T2) int {
	var ver1, ver2 *goversion.Version

	switch val := any(v1).(type) {
	case string:
		ver1 = goversion.Must(goversion.NewVersion(val))
	case *goversion.Version:
		ver1 = val
	}

	switch val := any(v2).(type) {
	case string:
		ver2 = goversion.Must(goversion.NewVersion(val))
	case *goversion.Version:
		ver2 = val
	}
	return ver1.Core().Compare(ver2.Core())
}

// CheckConstraint returns true if the version `v` satisfies the constraint.
//
// v can be passed either as string or *goversion.Version,
// otherwise this function will panic.
func CheckConstraint[V version](v V, c string) bool {
	var ver *goversion.Version

	switch val := any(v).(type) {
	case string:
		ver = goversion.Must(goversion.NewVersion(val))
	case *goversion.Version:
		ver = val
	}

	constraint, err := goversion.NewConstraint(c)
	if err != nil {
		panic(err)
	}
	return constraint.Check(ver)
}

// NewSupportedVersion returns a new SupportedVersion struct.
func NewSupportedVersion(meta *versionpb.MetadataVersion) (*SupportedVersion, error) {
	supVer := &SupportedVersion{}

	// Parse MetadataVersion into supportedVersion struct.
	config := map[string]*goversion.Constraints{
		"cli":           &supVer.Cli,
		"olm":           &supVer.Olm,
		"catalog":       &supVer.Catalog,
		"kubernetes":    &supVer.Kubernetes,
		"pgOperator":    &supVer.PGOperator,
		"pxcOperator":   &supVer.PXCOperator,
		"psmdbOperator": &supVer.PSMBDOperator,
	}
	for key, ref := range config {
		if s, ok := meta.GetSupported()[key]; ok {
			c, err := goversion.NewConstraint(s)
			if err != nil {
				return nil, errors.Join(err, fmt.Errorf("invalid %s constraint %s", key, s))
			}
			*ref = c
		}
	}

	return supVer, nil
}

// CheckK8sRequirements checks Kubernetes requirements.
func CheckK8sRequirements(supVer *SupportedVersion, l *zap.SugaredLogger, kubeClient serverVersionGetter) error {
	if len(supVer.Kubernetes) > 0 {
		l.Info("Checking Kubernetes version requirements")
		k8sVersionInfo, err := kubeClient.GetServerVersion()
		if err != nil {
			return errors.Join(err, errors.New("could not retrieve Kubernetes version"))
		}

		k8sVersion, err := goversion.NewVersion(k8sVersionInfo.GitVersion)
		if err != nil {
			return fmt.Errorf("invalid Kubernetes version %s: %w", k8sVersionInfo.GitVersion, err)
		}

		if !supVer.Kubernetes.Check(k8sVersion.Core()) {
			return fmt.Errorf(
				"kubernetes version %q does not meet minimum requirements of %q",
				k8sVersion.String(), supVer.Kubernetes.String(),
			)
		}

		l.Debugf("Finished requirements check for Kubernetes version")
	}

	return nil
}

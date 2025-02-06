package common

import (
	"errors"
	"fmt"

	versionpb "github.com/Percona-Lab/percona-version-service/versionpb"
	goversion "github.com/hashicorp/go-version"
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
	return constraint.Check(ver.Core())
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

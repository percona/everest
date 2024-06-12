package common

import goversion "github.com/hashicorp/go-version"

// CompareVersions compares two versions.
// Returns:
// -1 if v1 < v2
// 0 if v1 == v2
// 1 if v1 > v2
//
// Arguments can be passed either as string or *goversion.Version,
// otherwise this function will panic.
func CompareVersions(v1, v2 interface{}) int {
	var ver1, ver2 *goversion.Version

	switch val := v1.(type) {
	case string:
		ver1 = goversion.Must(goversion.NewVersion(val))
	case *goversion.Version:
		ver1 = val
	default:
		panic("v1 must be either string or *goversion.Version")
	}

	switch val := v2.(type) {
	case string:
		ver2 = goversion.Must(goversion.NewVersion(val))
	case *goversion.Version:
		ver2 = val
	default:
		panic("v2 must be either string or *goversion.Version")
	}
	return ver1.Core().Compare(ver2.Core())
}

package common

import (
	goversion "github.com/hashicorp/go-version"
)

// CompareVersion compares two version.
// Returns:
// -1 if v1 < v2
// 0 if v1 == v2
// 1 if v1 > v2
//
// Arguments can be passed either as string or *goversion.Version,
// otherwise this function will panic.
func CompareVersions(v1, v2 interface{}) int {
	var ver1, ver2 *goversion.Version

	switch v1.(type) {
	case string:
		ver1 = goversion.Must(goversion.NewVersion(v1.(string)))
	case *goversion.Version:
		ver1 = v1.(*goversion.Version)
	default:
		panic("v1 must be either string or *goversion.Version")
	}

	switch v2.(type) {
	case string:
		ver2 = goversion.Must(goversion.NewVersion(v2.(string)))
	case *goversion.Version:
		ver2 = v2.(*goversion.Version)
	default:
		panic("v2 must be either string or *goversion.Version")
	}
	return ver1.Core().Compare(ver2.Core())
}

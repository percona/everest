package common

import goversion "github.com/hashicorp/go-version"

type version interface {
	string | *goversion.Version
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

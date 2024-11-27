// Package must provides a function to panic if an error is not nil.
package must

// Must panics if err is not nil.
//
//nolint:ireturn
func Must[T any](obj T, err error) T {
	if err != nil {
		panic(err)
	}
	return obj
}

package must

// Must panics if err is not nil.
func Must[T any](obj T, err error) T {
	if err != nil {
		panic(err)
	}
	return obj
}

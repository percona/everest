# Go Best practices

- Read more
  - [Tech stack](./tech_stack.md)
  - [Code style](#code-style)

- All our software should handle termination signals: `SIGTERM`, `SIGINT`. The first time signal is received, the program should start graceful shutdown, typically by canceling parent context. It also should stop handling those termination signals, so the second time signal is received default handler is invoked, and the program is terminated.
- During program startup, most errors should be treated as fatal. If the program can't connect to an external resource, or can't bind to a port, or something like that, it should log an error and exit with non-zero status code.

  After startup, during normal program execution, most errors should be handled, logged and communicated to the user. For example, REST API call should return an appropriate HTTP status code with error details; full details should be logged. The caller can then handle the problem and retry the call. If an external resource becomes unavailable, the program should try to reconnect to it with proper backoff policy.

  - Issues detected at program initialization phase - such as a missing external dependency or a port, which is already in use - is either a configuration or an environment problem, or a programming bug. Neither can be fixed by simply continuing. Attempts to make startup "smart" (re-read configuration file, re-parse command-line flags, etc.) significantly complicate it. On the other hand, when an error happens during normal program execution, there is usually a proper way to communicate it back to the user so they can retry.

## Code style

- `make format`
- Follow [Effective Go](https://golang.org/doc/effective_go.html) and [CodeReviewComments](https://github.com/golang/go/wiki/CodeReviewComments) wiki page.
- `make check` to run linters
- Try to keep the code consistent
- In addition, more specific variable naming conventions we try to follow are provided in this blogpost https://medium.com/@lynzt/variable-naming-conventions-in-go-89fe1ef17b0a:
  - Use [camelCase](https://en.wikipedia.org/wiki/Camel_case)
  - Acronyms should be all capitals, as in `ServeHTTP`
  - Single letter represents index: `i`, `j`, `k`
  - Short but descriptive names: `cust` not `customer`
  - Repeat letters to represent collection, slice, or array and use a single letter in loop (`var tt []*Thing`).
  - Avoid repeating the package name in the method name:
    - `log.Info() // good`
    - `log.LogInfo() // bad`
  - Don’t name methods like `getters` or `setters`
  - Follow the language rules when using compound nouns: `ApplicationServer` not `ApplicationsServer`. Exceptions to this rule may apply when the code is auto-generated.
  - Add `er` to Interface\* (Exception: when we use Interface as a template to generate mocks)
- If we need to make a set, it's better to use `map[string]struct{}` instead of `map[string]bool` or something else.
- In case we need enums, it's better to create a new custom type inherited from `string` or `iota`.
- To check if a string is empty or not, use `str != ""` instead of `len(str) != 0`

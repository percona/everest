package install

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidateNamespaces(t *testing.T) {
	t.Parallel()

	type tcase struct {
		name   string
		input  string
		output []string
		error  error
	}

	tcases := []tcase{
		{
			name:   "empty string",
			input:  "",
			output: nil,
			error:  ErrNSEmpty,
		},
		{
			name:   "several empty strings",
			input:  "   ,   ,",
			output: nil,
			error:  ErrNSEmpty,
		},
		{
			name:   "correct",
			input:  "aaa,bbb,ccc",
			output: []string{"aaa", "bbb", "ccc"},
			error:  nil,
		},
		{
			name: "correct with spaces",
			input: `    aaa, bbb 
,ccc   `,
			output: []string{"aaa", "bbb", "ccc"},
			error:  nil,
		},
		{
			name:   "reserved system ns",
			input:  "everest-system",
			output: nil,
			error:  ErrNSReserved("everest-system"),
		},
		{
			name:   "reserved system ns and empty ns",
			input:  "everest-system,    ",
			output: nil,
			error:  ErrNSReserved("everest-system"),
		},
		{
			name:   "reserved monitoring ns",
			input:  "everest-monitoring",
			output: nil,
			error:  ErrNSReserved("everest-monitoring"),
		},
		{
			name:   "duplicated ns",
			input:  "aaa,bbb,aaa",
			output: []string{"aaa", "bbb"},
			error:  nil,
		},
		{
			name:   "name is too long",
			input:  "e1234567890123456789012345678901234567890123456789012345678901234567890,bbb",
			output: nil,
			error:  ErrNameNotRFC1035Compatible("e1234567890123456789012345678901234567890123456789012345678901234567890"),
		},
		{
			name:   "name starts with number",
			input:  "1aaa,bbb",
			output: nil,
			error:  ErrNameNotRFC1035Compatible("1aaa"),
		},
		{
			name:   "name contains special characters",
			input:  "aa12a,b$s",
			output: nil,
			error:  ErrNameNotRFC1035Compatible("b$s"),
		},
	}

	for _, tc := range tcases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			output, err := ValidateNamespaces(tc.input)
			assert.Equal(t, tc.error, err)
			assert.ElementsMatch(t, tc.output, output)
		})
	}
}

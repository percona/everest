package common

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"

	"github.com/percona/everest/pkg/accounts"
)

func generateRandomPassword() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// CreateInitialAdminAccount creates the initial admin account
// with a random plain-text password.
func CreateInitialAdminAccount(
	ctx context.Context,
	c accounts.Interface,
) error {
	pass, err := generateRandomPassword()
	if err != nil {
		return errors.Join(err, errors.New("could not generate random password"))
	}
	// Check if the admin account exists?
	if _, err := c.Get(ctx, EverestAdminUser); errors.Is(err, accounts.ErrAccountNotFound) {
		if createErr := c.Create(ctx, EverestAdminUser, pass); createErr != nil {
			return errors.Join(createErr, errors.New("could not create admin account"))
		}
	}
	// Create the admin account.
	return c.SetPassword(ctx, EverestAdminUser, pass, false)
}

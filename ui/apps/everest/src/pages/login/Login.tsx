import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Button, Divider, Stack, Typography, Link } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Card, EverestMainIcon, TextInput } from '@percona/ui-lib';
import { AuthContext } from 'contexts/auth';
import { useContext } from 'react';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';
import { LoginFormType, loginSchema } from './Login.constants';
import { Messages } from './Login.messages';

const LoginLinkButton = ({
  icon,
  text,
  href,
}: {
  icon: React.ReactNode;
  text: string;
  href: string;
}) => {
  return (
    <Link target="_blank" rel="noopener" href={href}>
      <Button startIcon={icon}>{text}</Button>
    </Link>
  );
};

const Login = () => {
  const methods = useForm<LoginFormType>({
    mode: 'onChange',
    defaultValues: { username: '', password: '' },
    resolver: zodResolver(loginSchema),
  });
  const { login, authStatus, redirectRoute, isSsoEnabled } =
    useContext(AuthContext);

  const handleLogin: SubmitHandler<LoginFormType> = ({
    username,
    password,
  }) => {
    login('manual', { username, password });
  };

  const handleSsoLogin = () => {
    login('sso');
  };

  if (authStatus === 'unknown') {
    return <></>;
  }

  if (authStatus === 'loggedIn') {
    return <Navigate to={redirectRoute ?? '/'} replace />;
  }

  return (
    <Stack flexDirection="row" height="100vh">
      <Stack py={16} px={5} width="35%">
        <EverestMainIcon sx={{ fontSize: '110px', mb: 3 }} />
        <Typography variant="h4" mb={3}>
          {Messages.welcome}
        </Typography>
        <Typography>{Messages.intro}</Typography>
        <Stack mt="auto" alignItems="flex-start">
          <LoginLinkButton
            icon={<ArrowForwardIcon />}
            text="Support"
            href="https://hubs.ly/Q02Rt6pG0"
          />
          <LoginLinkButton
            icon={<ArrowForwardIcon />}
            text="Quickstart guide"
            href="https://hubs.ly/Q02Rt6hk0"
          />
          <LoginLinkButton
            icon={<ArrowForwardIcon />}
            text="Forum"
            href="https://hubs.ly/Q02Rt6kD0"
          />
          <LoginLinkButton
            icon={<ArrowForwardIcon />}
            text="K8s Squad program"
            href="https://hubs.ly/Q02Rt6l60"
          />
          <LoginLinkButton
            icon={<ArrowForwardIcon />}
            text="Github"
            href="https://hubs.ly/Q02Rt6np0"
          />
        </Stack>
      </Stack>
      <Box
        width="65%"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage: "url('static/login_bg.svg')",
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        }}
      >
        <Card
          dataTestId="foo"
          sx={{
            width: '400px',
            py: 1,
            px: 3,
          }}
          content={
            <Stack alignItems="center">
              <Typography variant="h6" mb={3}>
                {Messages.login}
              </Typography>
              <Typography variant="caption" mb={2}>
                {Messages.insertCredentials}
              </Typography>
              <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(handleLogin)}>
                  <TextInput
                    textFieldProps={{
                      type: 'text',
                      label: Messages.username,
                      fullWidth: true,
                      sx: { mb: 2 },
                      disabled: authStatus === 'loggingIn',
                    }}
                    name="username"
                  />
                  <TextInput
                    textFieldProps={{
                      type: 'password',
                      label: Messages.password,
                      fullWidth: true,
                      sx: { mb: 2 },
                      disabled: authStatus === 'loggingIn',
                    }}
                    name="password"
                  />
                  <Button
                    onClick={methods.handleSubmit(handleLogin)}
                    type="submit"
                    disabled={authStatus === 'loggingIn'}
                    data-testid="login-button"
                    variant="contained"
                    fullWidth
                    sx={{
                      mb: 1,
                      fontSize: '13px',
                    }}
                  >
                    {Messages.login}
                  </Button>
                </form>
                {isSsoEnabled && (
                  <>
                    <Divider flexItem sx={{ mb: 1, fontSize: '12px' }}>
                      OR
                    </Divider>
                    <Button
                      variant="outlined"
                      fullWidth
                      disabled={authStatus === 'loggingIn'}
                      sx={{ fontSize: '13px' }}
                      onClick={handleSsoLogin}
                    >
                      Log in with SSO
                    </Button>
                  </>
                )}
              </FormProvider>
            </Stack>
          }
        />
      </Box>
    </Stack>
  );
};

export default Login;

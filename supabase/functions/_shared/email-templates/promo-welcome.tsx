/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface PromoWelcomeEmailProps {
  siteName: string
  siteUrl: string
  resetPasswordUrl: string
  tierDisplayName: string
  months: number
  recipientEmail: string
}

export const PromoWelcomeEmail = ({
  siteName = 'The Reserve Club',
  siteUrl = 'https://vinosaborapp.com',
  resetPasswordUrl = '#',
  tierDisplayName = 'Select',
  months = 3,
  recipientEmail = 'guest@example.com',
}: PromoWelcomeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been gifted a complimentary {tierDisplayName} membership at The Reserve Club</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img
            src="https://qqacjsczbrzerilgapqa.supabase.co/storage/v1/object/public/email-assets/vino-logo-trans.png"
            width="80"
            height="80"
            alt="The Reserve Club"
            style={logo}
          />
        </Section>

        <Heading style={h1}>Welcome to The Reserve Club</Heading>

        <Text style={text}>
          Great news! You've been gifted a <strong>complimentary {tierDisplayName} membership</strong> at
          The Reserve Club by Vino Sabor — our exclusive wine membership experience.
        </Text>

        <Section style={highlightBox}>
          <Text style={highlightTitle}>Your Membership Details</Text>
          <Text style={highlightDetail}>
            <strong>Tier:</strong> {tierDisplayName}
          </Text>
          <Text style={highlightDetail}>
            <strong>Duration:</strong> {months} {months === 1 ? 'month' : 'months'} complimentary
          </Text>
        </Section>

        <Text style={text}>
          To get started, set up your password by clicking the button below. Once your account is
          ready, you can log in and start enjoying your membership benefits right away.
        </Text>

        <Section style={buttonSection}>
          <Button style={button} href={resetPasswordUrl}>
            Set Your Password
          </Button>
        </Section>

        <Text style={smallText}>
          This link will expire in 24 hours. If it expires, you can request a new one from the login page.
        </Text>

        <Text style={footer}>
          If you weren't expecting this, you can safely ignore this email.
        </Text>
        <Text style={brand}>The Reserve Club by Vino Sabor</Text>
      </Container>
    </Body>
  </Html>
)

export default PromoWelcomeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 30px', maxWidth: '480px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '24px' }
const logo = { margin: '0 auto', borderRadius: '8px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  fontFamily: "'Playfair Display', Georgia, serif",
  color: '#1a1a1a',
  margin: '0 0 20px',
  textAlign: 'center' as const,
}
const text = {
  fontSize: '15px',
  color: '#555555',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const highlightBox = {
  backgroundColor: '#fdf8ef',
  border: '1px solid hsl(43, 74%, 52%)',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}
const highlightTitle = {
  fontSize: '14px',
  fontWeight: '600' as const,
  color: '#1a1a1a',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 12px',
}
const highlightDetail = {
  fontSize: '15px',
  color: '#333333',
  margin: '0 0 6px',
  lineHeight: '1.5',
}
const buttonSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  backgroundColor: 'hsl(43, 74%, 52%)',
  color: '#0a0a0a',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '8px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const smallText = {
  fontSize: '13px',
  color: '#888888',
  lineHeight: '1.5',
  margin: '0 0 20px',
  textAlign: 'center' as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', textAlign: 'center' as const }
const brand = { fontSize: '11px', color: '#bbbbbb', textAlign: 'center' as const, margin: '8px 0 0' }

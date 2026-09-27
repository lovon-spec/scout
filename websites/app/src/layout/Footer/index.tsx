import React from "react";
import styled, { css } from "styled-components";
import { Link } from "react-router-dom";

import { landscapeStyle, MAX_WIDTH_LANDSCAPE } from "styles/landscapeStyle";
import { responsiveSize } from "styles/responsiveSize";
import { hoverShortTransitionTiming } from "styles/commonStyles";

import { ExternalLink } from "components/ExternalLink";

const Container = styled.div`
  display: flex;
  width: 100%;
  background-color: ${({ theme }) => (theme.name === "dark" ? theme.lightGrey : theme.primaryPurple)};
  justify-content: center;
  margin-top: auto;
  z-index: 1;
`;

const Inner = styled.div`
  display: flex;
  width: 100%;
  max-width: ${MAX_WIDTH_LANDSCAPE};
  min-height: 114px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 8px 16px;
  gap: 16px;

  ${landscapeStyle(
    () => css`
      min-height: 64px;
      flex-direction: row;
      justify-content: space-between;
      padding: 0 ${responsiveSize(0, 48)};
    `
  )}
`;

// Community Scout: the public build this site came from, whose files anyone
// can check against their recorded provenance.
const COMMIT_SHA = import.meta.env.REACT_APP_COMMIT_SHA;
const SOURCE_REPO = import.meta.env.REACT_APP_SOURCE_REPO;
const BUILD_RUN_ID = import.meta.env.REACT_APP_BUILD_RUN_ID;
const BUILD_URL =
  COMMIT_SHA && SOURCE_REPO
    ? BUILD_RUN_ID
      ? `https://github.com/${SOURCE_REPO}/actions/runs/${BUILD_RUN_ID}`
      : `https://github.com/${SOURCE_REPO}/commit/${COMMIT_SHA}`
    : undefined;

// Community Scout: says whose fork this is, in place of Kleros's branding.
const Attribution = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.white}BF;
  font-size: 14px;
  font-family: "Manrope", sans-serif;
  text-align: center;

  a {
    ${hoverShortTransitionTiming}
    color: ${({ theme }) => theme.white}BF;
    text-decoration: underline;
  }

  a:hover {
    color: ${({ theme }) => theme.white};
  }
`;

const StyledToSLink = styled(Link)`
  ${hoverShortTransitionTiming}
  color: ${({ theme }) => theme.white}BF;
  text-decoration: none;
  font-size: 14px;
  font-family: "Manrope", sans-serif;

  &:hover {
    color: ${({ theme }) => theme.white};
    text-decoration: underline;
  }
`;

const FooterLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
`;

const StyledAgentLink = styled.a`
  ${hoverShortTransitionTiming}
  color: ${({ theme }) => theme.white}BF;
  text-decoration: none;
  font-size: 14px;
  font-family: "Manrope", sans-serif;

  &:hover {
    color: ${({ theme }) => theme.white};
    text-decoration: underline;
  }
`;

const Footer: React.FC = () => (
  <Container>
    <Inner>
      <Attribution>
        An independently operated community fork of{" "}
        <ExternalLink to="https://scout.kleros.io" target="_blank" rel="noreferrer">
          Kleros Scout
        </ExternalLink>
        .
      </Attribution>
      <FooterLinks>
        <StyledToSLink to="/terms-of-service">
          Terms of Service
        </StyledToSLink>
        <StyledAgentLink
          href="/llms.txt"
          rel="help"
          title="LLM instructions for Scout agents"
        >
          For agents
        </StyledAgentLink>
        {BUILD_URL && COMMIT_SHA ? (
          <StyledAgentLink
            href={BUILD_URL}
            target="_blank"
            rel="noreferrer"
            title="The public build these files came from"
          >
            Build {COMMIT_SHA.slice(0, 7)}
          </StyledAgentLink>
        ) : null}
      </FooterLinks>
    </Inner>
  </Container>
);

export default Footer;

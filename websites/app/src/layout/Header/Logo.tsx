import React from "react";
import styled from "styled-components";

import { hoverShortTransitionTiming } from "styles/commonStyles";

import { Link } from "react-router-dom";


const Container = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
`;

// Community Scout: its own wordmark, not Kleros's logo.
const Wordmark = styled.span`
  ${hoverShortTransitionTiming}
  font-family: "Space Grotesk", sans-serif;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
  white-space: nowrap;
  color: ${({ theme }) => theme.white};

  &:hover {
    color: ${({ theme }) => theme.white}BF;
  }
`;

const StyledLink = styled(Link)`
  text-decoration: none;
`;

const Logo: React.FC = () => (
  <Container>
    {" "}
    <StyledLink to={"/"} aria-label="Community Scout home">
      <Wordmark>Community Scout</Wordmark>
    </StyledLink>
  </Container>
);

export default Logo;

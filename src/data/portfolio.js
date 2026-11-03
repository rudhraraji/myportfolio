// All portfolio content lives here, so updating the site means editing data, not markup.
import photo from '../assets/photo.jpg';

import masaladosa from '../assets/projects/masaladosa.jpg';
import interhampers from '../assets/projects/interhampers.jpg';
import tilerescue from '../assets/projects/tilerescue.jpg';
import bawbaw from '../assets/projects/bawbawphysicians.jpg';
import batmanshill from '../assets/projects/batmanshill.jpg';
import sofasdirect from '../assets/projects/sofasdirect.jpg';
import loxo from '../assets/projects/loxo.jpg';
import rajiportfolio from '../assets/projects/rajiportfolio.jpg';
import feathers from '../assets/projects/feathers.jpg';
import auctionlights from '../assets/projects/auctionlights.jpg';
import portfolioReact from '../assets/projects/portfolioReact.jpg';

export const profile = {
  name: 'Raji Rudhrakumar',
  title: 'Senior Test Analyst - Automation & AI',
  photo,
  email: 'rajirudhrakumar@gmail.com',
  phone: '0421 355 709',
  phoneIntl: '+61421355709',
  location: 'Melbourne CBD',
  workingAt: 'Looking for a new role',
  linkedin: 'https://www.linkedin.com/in/rajirudhrakumar',
  github: 'https://github.com/rudhraraji/myportfolio',
};

// Key skills from the Skills table in my resume.
export const rotatingSkills = [
  'Playwright', 'Tricentis Tosca','Appium', 'Selenium WebDriver', 'REST Assured',
  'GitHub Copilot', 'Claude', 'Cursor', 'Playwright MCP', 'AI Agents', 'LLM-based Testing', 'Prompt Engineering',
  'Postman', 'API Testing', 'Java', 'JavaScript', 'SQL', 'Cucumber (BDD)',
  'Mobile Testing', 'Salesforce', 'Jira', 'Accessibility Testing', 'CI/CD', 'Agile',
];

// From the Summary and Experience sections of my resume.
export const intro = [
'Senior Test Analyst with 8+ years of IT experience in manual, automation, API, mobile and Salesforce testing across banking, insurance, healthcare and enterprise applications.',
'Skilled in Playwright, Tricentis Tosca, Selenium, Appium, REST Assured and Postman, with programming proficiency in Java, C#, JavaScript, TypeScript and SQL, and experience with accessibility testing (WCAG 2.1 AA) in Agile teams.',
'ISTQB Certified in Generative AI, currently applying GitHub Copilot, AI agents, Playwright MCP and LLM-based testing to improve test coverage, efficiency and software quality.'
];

// Skills tab: the categories and tools from the Skills table in my resume.
export const skillGroups = [
  { label: 'Test Automation', color: '#D64747', skills: ['Playwright', 'Appium', 'Tricentis Tosca', 'Selenium WebDriver', 'REST Assured'] },
  { label: 'AI Agents & Tools', color: '#6c4ad6', skills: ['GitHub Copilot', 'Claude', 'Cursor', 'Playwright MCP', 'AI Agents', 'LLM-based Testing', 'Prompt Engineering'] },
  { label: 'API', color: '#FF681F', skills: ['Postman', 'Swagger (Open API)', 'REST API Testing', 'API Automation', 'JSON', 'XML'] },
  { label: 'Programming', color: '#3a89c9', skills: ['Java', 'JavaScript', 'C#', 'SQL', 'HTML', 'CSS', 'PHP'] },
  { label: 'Automation Frameworks', color: '#3ac942', skills: ['JUnit', 'TestNG', 'Cucumber (BDD)', 'Page Object Model (POM)'] },
  { label: 'Mobile Testing', color: '#a0349f', skills: ['Android', 'iOS', 'Browser Stack', 'Xcode', 'Android Studio', 'Charles Proxy', 'HTTP Toolkit', 'Vysor', '5KPlayer'] },
  { label: 'CI/CD & Version Control', color: '#1c9cbd', skills: ['GitLab', 'Jenkins', 'Bitbucket', 'Git', 'GitHub'] },
  { label: 'Test Management', color: '#98700a', skills: ['Jira', 'TestRail', 'qTest', 'Bugzilla', 'Confluence'] },
  { label: 'Databases', color: '#5c93c8', skills: ['MySQL', 'SQL Server', 'MongoDB'] },
  { label: 'Platforms & Applications', color: '#c51212', skills: ['Salesforce', 'iCAD', 'MDT', 'WordPress', 'Joomla', 'Magento', 'OpenCart'] },
  { label: 'Testing Types', color: '#e67e22', wide: true, skills: ['Functional', 'Regression', 'Integration', 'System', 'End-to-End (E2E)', 'API', 'Mobile', 'Smoke', 'Sanity', 'User Acceptance (UAT)', 'Accessibility (WCAG 2.1 AA)', 'Cross-Browser'] },
  { label: 'Methodologies', color: '#939393', skills: ['Agile (Scrum, Kanban)', 'SDLC', 'STLC'] },
];

// Experience now lives in experience.json (edited from the admin portal at #admin).

export const portfolio = [
  { name: 'Portfolio (React)', url: 'https://github.com/rudhraraji/myportfolio', image: portfolioReact },
  { name: 'Masala Dosa', url: 'http://masaladosa.com.au', image: masaladosa },
  { name: 'Interhampers', url: 'https://store.interhampers.com.au', image: interhampers },
  { name: 'Tile Rescue', url: 'http://www.forster.tilerescue.com.au', image: tilerescue },
  { name: 'Baw Baw Physicians', url: 'http://12three.com.au/development/bawbawphysicians', image: bawbaw },
  { name: "Batman's Hill", url: 'http://www.batmanshill.com.au/dev-2017/', image: batmanshill },
  { name: 'Sofas Direct', url: 'http://www.sofasdirect.com.au/', image: sofasdirect },
  { name: 'Loxo', url: 'http://loxo.com.au/', image: loxo },
  { name: 'Portfolio (Rails)', url: 'https://github.com/rudhraraji/myportfolio', image: rajiportfolio },
  { name: 'Feathers', url: 'https://www.feathers.com.au', image: feathers },
  { name: 'Auction Lights', url: 'http://develop.auctionlights.com.au', image: auctionlights },
];

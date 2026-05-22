// Allows TypeScript to accept bare CSS imports used by NativeWind's global stylesheet
declare module "*.css" {
  const content: string;
  export default content;
}

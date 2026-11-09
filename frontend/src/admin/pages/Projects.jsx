import ContentList from '../components/ContentList.jsx';

export default function Projects() {
  return (
    <ContentList
      endpoint="/projects"
      route="projects"
      publicBase="projects"
      noun="project"
      title="Projects"
      description="Published projects appear automatically on the Work page, ordered by their sort order."
      emptyHint="Add your first project, or import the starter content from the dashboard."
    />
  );
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // Escape "<" so user-editable text can never close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

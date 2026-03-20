type SubmissionFile = {
  path: string;
  minio_key: string;
};

export function stripSharedSubmissionRoot<T extends SubmissionFile>(
  files: T[],
) {
  if (files.length === 0) {
    return files;
  }

  const firstSegments = files.map((file) =>
    file.path.split("/").filter(Boolean),
  );
  const sharedRoot = firstSegments[0]?.[0];

  if (!sharedRoot) {
    return files;
  }

  const shouldStrip = firstSegments.every(
    (segments) => segments.length > 1 && segments[0] === sharedRoot,
  );

  if (!shouldStrip) {
    return files;
  }

  return files.map((file, index) => ({
    ...file,
    path: firstSegments[index]!.slice(1).join("/"),
  }));
}

import path from 'node:path';

const SERVER_ALIAS_PREFIX = '@server/';

const toPosixPath = (value) => value.split(path.sep).join('/');

const toRelativeImportPath = (fromDir, targetPath) => {
  const relativePath = path.relative(fromDir, targetPath);
  const posixRelativePath = toPosixPath(relativePath);

  if (!posixRelativePath || posixRelativePath.startsWith('..')) {
    return null;
  }

  return posixRelativePath.startsWith('.') ? posixRelativePath : `./${posixRelativePath}`;
};

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Warn when @server alias is used even though the import can be written as a same-level relative path.',
    },
    schema: [],
    messages: {
      preferRelative:
        'この import は相対参照で書けます。{{suggestion}} を使ってください（@server は遡りが必要な場合のみ使用）。',
    },
  },
  create(context) {
    const filename = context.filename;
    if (!filename || filename === '<input>') {
      return {};
    }

    const srcRoot = path.resolve(process.cwd(), 'src');
    const absoluteFilename = path.resolve(filename);

    if (!absoluteFilename.startsWith(`${srcRoot}${path.sep}`)) {
      return {};
    }

    const fromDirectory = path.dirname(absoluteFilename);

    return {
      ImportDeclaration(node) {
        const rawImportPath = node.source?.value;
        if (typeof rawImportPath !== 'string') {
          return;
        }

        if (!rawImportPath.startsWith(SERVER_ALIAS_PREFIX)) {
          return;
        }

        const aliasedSubPath = rawImportPath.slice(SERVER_ALIAS_PREFIX.length);
        if (!aliasedSubPath) {
          return;
        }

        const targetPath = path.resolve(srcRoot, aliasedSubPath);
        const suggestion = toRelativeImportPath(fromDirectory, targetPath);

        if (!suggestion) {
          return;
        }

        context.report({
          node: node.source,
          messageId: 'preferRelative',
          data: { suggestion },
        });
      },
    };
  },
};

import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeViewerProps {
    code: string;
    language: string;
}

const CodeViewer: React.FC<CodeViewerProps> = ({ code, language }) => {
    return (
        <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            customStyle={{ background: 'transparent', height: '100%', margin: 0 }}
            codeTagProps={{ style: { fontFamily: '"Fira Code", monospace' } }}
            showLineNumbers
        >
            {code}
        </SyntaxHighlighter>
    );
};

export default CodeViewer;
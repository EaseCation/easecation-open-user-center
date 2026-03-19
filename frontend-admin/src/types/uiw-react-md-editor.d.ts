declare module '@uiw/react-md-editor' {
    import type { ComponentType } from 'react';

    type MDEditorComponent = ComponentType<any> & {
        Markdown: ComponentType<any>;
    };

    const MDEditor: MDEditorComponent;

    export default MDEditor;
}

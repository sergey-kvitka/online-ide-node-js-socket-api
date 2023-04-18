// noinspection JSValidateTypes,JSUnresolvedFunction

const mongoose = require('mongoose');
const Document = require('./Document');

mongoose.connect('mongodb://localhost/online-ide-files-db', {});

const io = require('socket.io')(3030, {
    cors: {
        origin: 'http://localhost:3010',
        methods: ['GET', 'POST']
    }
});

io.on('connection', socket => {
    socket.on('get-document', async documentId => {
        const document = await findOrCreateDocument(documentId);
        socket.join(documentId);
        console.log(`\tDocument connected (${documentId})`); // ! !

        socket.emit('load-document', document.data);

        socket.on('send-changes', delta => {
            socket.broadcast.to(documentId).emit('receive-changes', delta);
        });

        socket.on('save-document', async data => {
            await Document.findByIdAndUpdate(documentId, {data});
        });
    });

    socket.on('get-project-content', async projectId => {
        socket.join(projectId);
        console.log(`Project connected (${projectId})`); // ! !

        socket.on(`project-content-request-${projectId}`, async documentIds => {
            socket.emit(`project-content-response-${projectId}`, await getContent(documentIds));
        });
    });
});

async function findOrCreateDocument(id) {
    if (!id) return;
    const document = await Document.findById(id);
    if (document) return document;
    return await Document.create({_id: id, data: ''});
}

async function getContent(IDs) {
    if (!IDs) return;
    let documents = await Document.find({'_id': {$in: IDs}});
    return documents.map(document => {
        let ops = document.data['ops'];
        if (!ops) ops = [];
        let content = '';
        ops.forEach(op => content += op['insert']);
        return {
            id: document._id,
            content: content.split('\n')
        };
    });
}
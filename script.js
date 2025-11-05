// Общие данные для всех пользователей
const sharedData = {
    users: {
        1: { id: 1, name: "Алексей", avatar: "А", isOnline: true },
        2: { id: 2, name: "Мария", avatar: "М", isOnline: true },
        3: { id: 3, name: "Иван", avatar: "И", isOnline: true }
    },
    messages: {},
    lastMessageId: 0
};

// Текущий пользователь
let currentUser = null;
let appData = {
    activeContactId: null
};

// DOM элементы
const contactsList = document.getElementById('contactsList');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const fileBtn = document.getElementById('fileBtn');
const fileInput = document.getElementById('fileInput');
const chatContactName = document.getElementById('chatContactName');
const chatContactAvatar = document.getElementById('chatContactAvatar');
const notification = document.getElementById('notification');
const searchInput = document.querySelector('.search-input');
const userModal = document.getElementById('userModal');
const currentUserAvatar = document.getElementById('currentUserAvatar');
const currentUserName = document.getElementById('currentUserName');
const switchUserBtn = document.getElementById('switchUserBtn');
const confirmUserBtn = document.getElementById('confirmUser');

// Обработка мобильных событий
function setupMobileEvents() {
    // Предотвращение двойного тапа для зума
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    // Улучшение responsiveness для мобильных
    document.addEventListener('touchstart', function() {}, {passive: true});
}

// Инициализация приложения
function initApp() {
    loadSharedData();
    showUserSelection();
    setupEventListeners();
    setupMobileEvents();
    startDataSync();
}

// Загрузка общих данных
function loadSharedData() {
    const savedData = localStorage.getItem('messengerSharedData');
    if (savedData) {
        const parsedData = JSON.parse(savedData);
        Object.assign(sharedData, parsedData);
    }
    
    // Инициализируем сообщения если их нет
    initializeMessages();
}

// Сохранение общих данных
function saveSharedData() {
    localStorage.setItem('messengerSharedData', JSON.stringify(sharedData));
}

// Инициализация сообщений
function initializeMessages() {
    // Создаем начальные сообщения между пользователями
    const conversations = [
        { users: [1, 2], messages: [
            { id: 1, senderId: 2, text: "Привет! Как дела?", timestamp: Date.now() - 3600000, type: "text" },
            { id: 2, senderId: 1, text: "Привет! Всё отлично!", timestamp: Date.now() - 3500000, type: "text" }
        ]},
        { users: [1, 3], messages: [
            { id: 1, senderId: 3, text: "Добрый день! Есть минутка?", timestamp: Date.now() - 86400000, type: "text" }
        ]},
        { users: [2, 3], messages: [
            { id: 1, senderId: 2, text: "Привет! Встречаемся сегодня?", timestamp: Date.now() - 43200000, type: "text" },
            { id: 2, senderId: 3, text: "Да, в 18:00 как договорились", timestamp: Date.now() - 43000000, type: "text" }
        ]}
    ];

    conversations.forEach(conv => {
        const chatId = getChatId(conv.users[0], conv.users[1]);
        if (!sharedData.messages[chatId]) {
            sharedData.messages[chatId] = conv.messages;
            sharedData.lastMessageId = Math.max(sharedData.lastMessageId, ...conv.messages.map(m => m.id));
        }
    });
}

// Показ выбора пользователя
function showUserSelection() {
    userModal.style.display = 'flex';
    
    const userOptions = document.querySelectorAll('.user-option');
    userOptions.forEach(option => {
        option.classList.remove('selected');
        option.addEventListener('click', function() {
            userOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
    
    // Выбираем первого пользователя по умолчанию
    userOptions[0].classList.add('selected');
}

// Подтверждение выбора пользователя
confirmUserBtn.addEventListener('click', function() {
    const selectedUser = document.querySelector('.user-option.selected');
    if (selectedUser) {
        const userId = parseInt(selectedUser.dataset.userId);
        setCurrentUser(userId);
        userModal.style.display = 'none';
        renderContacts();
    }
});

// Установка текущего пользователя
function setCurrentUser(userId) {
    currentUser = sharedData.users[userId];
    currentUserAvatar.textContent = currentUser.avatar;
    currentUserName.textContent = `${currentUser.name} (Вы)`;
    
    // Обновляем данные приложения для текущего пользователя
    updateAppData();
}

// Обновление данных приложения
function updateAppData() {
    if (!currentUser) return;
    
    // Получаем контакты для текущего пользователя
    const contacts = Object.values(sharedData.users).filter(user => user.id !== currentUser.id);
    
    appData.contacts = contacts;
    appData.currentUser = currentUser;
}

// Получение ID чата
function getChatId(user1Id, user2Id) {
    return [user1Id, user2Id].sort().join('_');
}

// Рендеринг списка контактов
function renderContacts(filter = '') {
    if (!currentUser) return;
    
    contactsList.innerHTML = '';
    
    const filteredContacts = appData.contacts.filter(contact => 
        contact.name.toLowerCase().includes(filter.toLowerCase())
    );
    
    if (filteredContacts.length === 0) {
        contactsList.innerHTML = '<div class="no-contacts">Контакты не найдены</div>';
        return;
    }
    
    filteredContacts.forEach(contact => {
        const chatId = getChatId(currentUser.id, contact.id);
        const lastMessage = getLastMessage(chatId);
        
        const contactElement = document.createElement('div');
        contactElement.className = 'contact';
        if (appData.activeContactId === contact.id) {
            contactElement.classList.add('active');
        }
        contactElement.dataset.contactId = contact.id;
        
        contactElement.innerHTML = `
            <div class="contact-avatar">${contact.avatar}</div>
            <div class="contact-info">
                <div class="contact-name">${highlightText(contact.name, filter)} 
                    <span class="online-status">${contact.isOnline ? '🟢' : '⚫'}</span>
                </div>
                <div class="last-message">${lastMessage ? formatLastMessage(lastMessage) : 'Нет сообщений'}</div>
            </div>
        `;
        
        contactElement.addEventListener('click', () => selectContact(contact.id));
        contactsList.appendChild(contactElement);
    });
}

// Форматирование последнего сообщения
function formatLastMessage(message) {
    const isCurrentUser = message.senderId === currentUser.id;
    const prefix = isCurrentUser ? 'Вы: ' : '';
    
    if (message.type === 'text') {
        return prefix + (message.text.length > 30 ? message.text.substring(0, 30) + '...' : message.text);
    } else {
        return prefix + 'Файл';
    }
}

// Подсветка текста в результатах поиска
function highlightText(text, filter) {
    if (!filter) return text;
    
    const regex = new RegExp(`(${filter})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// Поиск контактов
function searchContacts() {
    const searchTerm = searchInput.value.trim();
    renderContacts(searchTerm);
}

// Получение последнего сообщения для чата
function getLastMessage(chatId) {
    const messages = sharedData.messages[chatId];
    return messages && messages.length > 0 ? messages[messages.length - 1] : null;
}

// Выбор контакта для чата
function selectContact(contactId) {
    appData.activeContactId = contactId;
    
    // Обновляем активный контакт в UI
    document.querySelectorAll('.contact').forEach(contact => {
        contact.classList.remove('active');
        if (parseInt(contact.dataset.contactId) === contactId) {
            contact.classList.add('active');
        }
    });
    
    // Обновляем заголовок чата
    const contact = appData.contacts.find(c => c.id === contactId);
    chatContactName.textContent = contact.name;
    chatContactAvatar.textContent = contact.avatar;
    
    // Загружаем сообщения
    renderMessages();
    
    // Прокручиваем вниз
    scrollToBottom();
    
    // Очищаем поиск после выбора контакта
    searchInput.value = '';
    renderContacts('');
}

// Рендеринг сообщений
function renderMessages() {
    messagesContainer.innerHTML = '';
    
    if (!appData.activeContactId || !currentUser) {
        messagesContainer.innerHTML = '<div style="text-align: center; margin-top: 50%; color: #7d8590;">Выберите чат для начала общения</div>';
        return;
    }
    
    const chatId = getChatId(currentUser.id, appData.activeContactId);
    const messages = sharedData.messages[chatId] || [];
    
    messages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.senderId === currentUser.id ? 'sent' : 'received'}`;
        
        if (message.type === 'text') {
            messageElement.innerHTML = `
                <div>${message.text}</div>
                <div class="message-time">${formatTime(message.timestamp)}</div>
            `;
        } else if (message.type === 'file') {
            messageElement.innerHTML = `
                <div>${message.senderId === currentUser.id ? 'Вы отправили файл' : 'Вам отправили файл'}</div>
                <div class="file-message">
                    <div class="file-icon">${getFileIcon(message.file.type)}</div>
                    <div class="file-info">
                        <div class="file-name">${message.file.name}</div>
                        <div class="file-size">${message.file.size}</div>
                    </div>
                    <button class="download-btn" onclick="downloadFile('${message.file.name}', '${message.file.size}')">Скачать</button>
                </div>
                <div class="message-time">${formatTime(message.timestamp)}</div>
            `;
        }
        
        messagesContainer.appendChild(messageElement);
    });
    
    scrollToBottom();
}

// Получение иконки для типа файла
function getFileIcon(fileType) {
    switch(fileType) {
        case 'pdf': return '📄';
        case 'image': return '🖼️';
        case 'video': return '🎬';
        case 'audio': return '🎵';
        case 'archive': return '📦';
        default: return '📎';
    }
}

// Форматирование времени
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // меньше минуты
        return 'только что';
    } else if (diff < 3600000) { // меньше часа
        const minutes = Math.floor(diff / 60000);
        return `${minutes} мин назад`;
    } else if (diff < 86400000) { // меньше суток
        const hours = Math.floor(diff / 3600000);
        return `${hours} ч назад`;
    } else {
        return date.toLocaleDateString('ru-RU', { 
            day: 'numeric', 
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Прокрутка вниз
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Отправка сообщения по клику на кнопку
    sendBtn.addEventListener('click', sendMessage);
    
    // Отправка сообщения по нажатию Enter
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Открытие диалога выбора файла
    fileBtn.addEventListener('click', () => fileInput.click());
    
    // Обработка выбора файла
    fileInput.addEventListener('change', handleFileSelect);
    
    // Поиск контактов
    searchInput.addEventListener('input', searchContacts);
    
    // Очистка поиска при нажатии Escape
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            renderContacts('');
        }
    });
    
    // Смена пользователя
    switchUserBtn.addEventListener('click', () => {
        showUserSelection();
    });
}

// Отправка сообщения
function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !appData.activeContactId || !currentUser) return;
    
    // Создаем новое сообщение
    const newMessage = {
        id: ++sharedData.lastMessageId,
        senderId: currentUser.id,
        text: text,
        timestamp: Date.now(),
        type: 'text'
    };
    
    // Добавляем сообщение в общие данные
    const chatId = getChatId(currentUser.id, appData.activeContactId);
    if (!sharedData.messages[chatId]) {
        sharedData.messages[chatId] = [];
    }
    sharedData.messages[chatId].push(newMessage);
    
    // Сохраняем общие данные
    saveSharedData();
    
    // Очищаем поле ввода
    messageInput.value = '';
    
    // Обновляем UI
    renderMessages();
    renderContacts();
    
    // Показываем уведомление
    showNotification('Сообщение отправлено');
}

// Обработка выбора файла
function handleFileSelect(e) {
    const files = e.target.files;
    if (!files.length || !appData.activeContactId || !currentUser) return;
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Определяем тип файла
        let fileType = 'other';
        if (file.type.startsWith('image/')) fileType = 'image';
        else if (file.type.startsWith('video/')) fileType = 'video';
        else if (file.type.startsWith('audio/')) fileType = 'audio';
        else if (file.type === 'application/pdf') fileType = 'pdf';
        else if (file.type.includes('zip') || file.type.includes('archive')) fileType = 'archive';
        
        // Создаем сообщение с файлом
        const newMessage = {
            id: ++sharedData.lastMessageId,
            senderId: currentUser.id,
            file: {
                name: file.name,
                size: formatFileSize(file.size),
                type: fileType
            },
            timestamp: Date.now(),
            type: 'file'
        };
        
        // Добавляем сообщение в общие данные
        const chatId = getChatId(currentUser.id, appData.activeContactId);
        if (!sharedData.messages[chatId]) {
            sharedData.messages[chatId] = [];
        }
        sharedData.messages[chatId].push(newMessage);
    }
    
    // Сохраняем общие данные
    saveSharedData();
    
    // Обновляем UI
    renderMessages();
    renderContacts();
    
    // Очищаем input файла
    fileInput.value = '';
    
    // Показываем уведомление
    showNotification('Файл отправлен');
}

// Форматирование размера файла
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
}

// Синхронизация данных
function startDataSync() {
    // Обновляем интерфейс каждые 2 секунды для получения новых сообщений
    setInterval(() => {
        if (currentUser) {
            loadSharedData();
            updateAppData();
            renderContacts();
            if (appData.activeContactId) {
                renderMessages();
            }
        }
    }, 2000);
}

// Показ уведомления
function showNotification(text) {
    notification.textContent = text;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Функция для скачивания файла (заглушка)
function downloadFile(filename, size) {
    showNotification(`Файл "${filename}" (${size}) будет скачан`);
    // В реальном приложении здесь будет логика скачивания файла
}

// Инициализация приложения при загрузке
document.addEventListener('DOMContentLoaded', initApp);
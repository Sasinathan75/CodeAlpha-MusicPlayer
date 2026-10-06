// ===============================
// MELODIFY - MUSIC PLAYER
// ===============================

const DB_NAME = "MelodifyDB";
const DB_VERSION = 1;
const STORE_NAME = "songs";

const DEFAULT_COVER =
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80";

// ===============================
// ELEMENTS
// ===============================

const audioPlayer = document.getElementById("audioPlayer");

const albumArt = document.getElementById("albumArt");
const songTitle = document.getElementById("songTitle");
const artistName = document.getElementById("artistName");

const currentTime = document.getElementById("currentTime");
const duration = document.getElementById("duration");
const progressBar = document.getElementById("progressBar");

const playBtn = document.getElementById("playBtn");
const previousBtn = document.getElementById("previousBtn");
const nextBtn = document.getElementById("nextBtn");

const shuffleBtn = document.getElementById("shuffleBtn");
const repeatBtn = document.getElementById("repeatBtn");

const muteBtn = document.getElementById("muteBtn");
const volumeBar = document.getElementById("volumeBar");

const favoriteBtn = document.getElementById("favoriteBtn");

const playlist = document.getElementById("playlist");
const playlistCount = document.getElementById("playlistCount");

const searchInput = document.getElementById("searchInput");

const addMusicBtn = document.getElementById("addMusicBtn");
const musicFileInput = document.getElementById("musicFileInput");

const themeBtn = document.getElementById("themeBtn");
const autoplayBtn = document.getElementById("autoplayBtn");

const toast = document.getElementById("toast");

// ===============================
// STATE
// ===============================

let songs = [];
let currentSongIndex = -1;

let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
let isAutoplay = false;

let currentObjectURL = null;

// ===============================
// INDEXEDDB
// ===============================

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, {
                    keyPath: "id",
                    autoIncrement: true
                });
            }
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

// ===============================
// GET ALL SONGS
// ===============================

async function getAllSongs() {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(
            STORE_NAME,
            "readonly"
        );

        const store = transaction.objectStore(STORE_NAME);

        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

// ===============================
// SAVE SONG
// ===============================

async function saveSong(song) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(
            STORE_NAME,
            "readwrite"
        );

        const store = transaction.objectStore(STORE_NAME);

        const request = store.add(song);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

// ===============================
// DELETE SONG FROM DATABASE
// ===============================

async function deleteSongFromDatabase(id) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(
            STORE_NAME,
            "readwrite"
        );

        const store = transaction.objectStore(STORE_NAME);

        const request = store.delete(id);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

// ===============================
// FORMAT TIME
// ===============================

function formatTime(time) {
    if (!time || isNaN(time)) {
        return "0:00";
    }

    const minutes = Math.floor(time / 60);

    const seconds = Math.floor(time % 60)
        .toString()
        .padStart(2, "0");

    return `${minutes}:${seconds}`;
}

// ===============================
// TOAST
// ===============================

function showToast(message) {
    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2200);
}

// ===============================
// LOAD SAVED SONGS
// ===============================

async function loadSavedSongs() {
    try {
        const savedSongs = await getAllSongs();

        songs = savedSongs.map((song) => ({
            ...song,
            audio: URL.createObjectURL(song.audioBlob)
        }));

        renderPlaylist();

        if (songs.length > 0) {
            loadSong(0, false);
        } else {
            showEmptyPlaylist();
        }

    } catch (error) {
        console.error("Failed to load songs:", error);

        showToast("Unable to load saved songs");
    }
}

// ===============================
// LOAD SONG
// ===============================

function loadSong(index, resetPlayer = true) {

    if (index < 0 || index >= songs.length) {
        return;
    }

    const song = songs[index];

    currentSongIndex = index;

    if (currentObjectURL) {
        URL.revokeObjectURL(currentObjectURL);
        currentObjectURL = null;
    }

    // Create a fresh object URL from stored Blob
    currentObjectURL = URL.createObjectURL(song.audioBlob);

    audioPlayer.src = currentObjectURL;

    songTitle.textContent = song.title || "Unknown Song";

    artistName.textContent = song.artist || "Unknown Artist";

    albumArt.src = song.cover || DEFAULT_COVER;

    currentTime.textContent = "0:00";

    duration.textContent =
        song.duration
            ? formatTime(song.duration)
            : "0:00";

    progressBar.value = 0;

    updateFavoriteButton();

    renderPlaylist();

    if (resetPlayer) {
        pauseSong();
    }
}

// ===============================
// PLAY SONG
// ===============================

async function playSong() {

    if (songs.length === 0) {
        showToast("Add music first");
        return;
    }

    if (currentSongIndex === -1) {
        loadSong(0);
    }

    try {
        await audioPlayer.play();

        isPlaying = true;

        playBtn.textContent = "⏸";

        albumArt.classList.add("playing");

    } catch (error) {
        console.error("Playback error:", error);

        showToast("Unable to play this song");
    }
}

// ===============================
// PAUSE SONG
// ===============================

function pauseSong() {

    audioPlayer.pause();

    isPlaying = false;

    playBtn.textContent = "▶";

    albumArt.classList.remove("playing");
}

// ===============================
// PLAY / PAUSE
// ===============================

playBtn.addEventListener("click", () => {

    if (isPlaying) {
        pauseSong();
    } else {
        playSong();
    }

});

// ===============================
// NEXT SONG
// ===============================

function nextSong() {

    if (songs.length === 0) {
        return;
    }

    let nextIndex;

    if (isShuffle && songs.length > 1) {

        do {
            nextIndex =
                Math.floor(Math.random() * songs.length);

        } while (nextIndex === currentSongIndex);

    } else {

        nextIndex =
            (currentSongIndex + 1) % songs.length;
    }

    loadSong(nextIndex);

    playSong();
}

// ===============================
// PREVIOUS SONG
// ===============================

function previousSong() {

    if (songs.length === 0) {
        return;
    }

    let previousIndex;

    if (currentSongIndex <= 0) {

        previousIndex =
            songs.length - 1;

    } else {

        previousIndex =
            currentSongIndex - 1;
    }

    loadSong(previousIndex);

    playSong();
}

// ===============================
// NEXT BUTTON
// ===============================

nextBtn.addEventListener("click", () => {
    nextSong();
});

// ===============================
// PREVIOUS BUTTON
// ===============================

previousBtn.addEventListener("click", () => {
    previousSong();
});

// ===============================
// AUTOMATIC ONE-BY-ONE PLAY
// ===============================

audioPlayer.addEventListener("ended", () => {

    // Repeat current song
    if (isRepeat) {

        audioPlayer.currentTime = 0;

        playSong();

        return;
    }

    // Automatically play next song
    if (songs.length > 1) {

        nextSong();

        return;
    }

    // Only one song
    pauseSong();
});

// ===============================
// PROGRESS UPDATE
// ===============================

audioPlayer.addEventListener(
    "timeupdate",
    () => {

        if (!audioPlayer.duration) {
            return;
        }

        const progress =
            (audioPlayer.currentTime /
                audioPlayer.duration) *
            100;

        progressBar.value = progress;

        currentTime.textContent =
            formatTime(audioPlayer.currentTime);
    }
);

// ===============================
// DURATION
// ===============================

audioPlayer.addEventListener(
    "loadedmetadata",
    () => {

        duration.textContent =
            formatTime(audioPlayer.duration);
    }
);

// ===============================
// PROGRESS BAR
// ===============================

progressBar.addEventListener(
    "input",
    () => {

        if (!audioPlayer.duration) {
            return;
        }

        const newTime =
            (progressBar.value / 100) *
            audioPlayer.duration;

        audioPlayer.currentTime = newTime;
    }
);

// ===============================
// VOLUME
// ===============================

audioPlayer.volume =
    Number(volumeBar.value);

volumeBar.addEventListener(
    "input",
    () => {

        audioPlayer.volume =
            Number(volumeBar.value);

        if (audioPlayer.volume === 0) {
            muteBtn.textContent = "🔇";
        } else {
            muteBtn.textContent = "🔊";
        }
    }
);

// ===============================
// MUTE
// ===============================

muteBtn.addEventListener("click", () => {

    audioPlayer.muted =
        !audioPlayer.muted;

    if (audioPlayer.muted) {
        muteBtn.textContent = "🔇";
    } else {
        muteBtn.textContent = "🔊";
    }
});

// ===============================
// SHUFFLE
// ===============================

shuffleBtn.addEventListener("click", () => {

    isShuffle = !isShuffle;

    shuffleBtn.classList.toggle(
        "active",
        isShuffle
    );

    showToast(
        isShuffle
            ? "Shuffle ON"
            : "Shuffle OFF"
    );
});

// ===============================
// REPEAT
// ===============================

repeatBtn.addEventListener("click", () => {

    isRepeat = !isRepeat;

    repeatBtn.classList.toggle(
        "active",
        isRepeat
    );

    showToast(
        isRepeat
            ? "Repeat ON"
            : "Repeat OFF"
    );
});

// ===============================
// AUTOPLAY BUTTON
// ===============================

autoplayBtn.addEventListener("click", () => {

    isAutoplay = !isAutoplay;

    autoplayBtn.textContent =
        isAutoplay
            ? "Autoplay: ON"
            : "Autoplay: OFF";

    autoplayBtn.classList.toggle(
        "active",
        isAutoplay
    );

    showToast(
        isAutoplay
            ? "Autoplay ON"
            : "Autoplay OFF"
    );
});

// ===============================
// FAVORITES
// ===============================

function getFavorites() {

    try {
        return JSON.parse(
            localStorage.getItem(
                "melodifyFavorites"
            )
        ) || [];

    } catch {
        return [];
    }
}

function saveFavorites(favorites) {

    localStorage.setItem(
        "melodifyFavorites",
        JSON.stringify(favorites)
    );
}

function updateFavoriteButton() {

    if (currentSongIndex < 0) {
        return;
    }

    const song = songs[currentSongIndex];

    const favorites = getFavorites();

    const isFavorite =
        favorites.includes(song.id);

    favoriteBtn.textContent =
        isFavorite
            ? "♥ Added to Favorites"
            : "♡ Add to Favorites";

    favoriteBtn.classList.toggle(
        "active",
        isFavorite
    );
}

favoriteBtn.addEventListener(
    "click",
    () => {

        if (currentSongIndex < 0) {
            return;
        }

        const song =
            songs[currentSongIndex];

        let favorites =
            getFavorites();

        if (favorites.includes(song.id)) {

            favorites =
                favorites.filter(
                    (id) => id !== song.id
                );

            showToast(
                "Removed from favorites"
            );

        } else {

            favorites.push(song.id);

            showToast(
                "Added to favorites"
            );
        }

        saveFavorites(favorites);

        updateFavoriteButton();

        renderPlaylist();
    }
);

// ===============================
// ADD MUSIC
// ===============================

addMusicBtn.addEventListener(
    "click",
    () => {

        musicFileInput.click();
    }
);

// ===============================
// MUSIC FILE INPUT
// ===============================

musicFileInput.addEventListener(
    "change",
    async (event) => {

        const files =
            Array.from(event.target.files);

        if (files.length === 0) {
            return;
        }

        let addedCount = 0;

        for (const file of files) {

            if (!file.type.startsWith("audio/")) {
                continue;
            }

            const objectURL =
                URL.createObjectURL(file);

            const tempAudio =
                document.createElement("audio");

            tempAudio.src = objectURL;

            await new Promise((resolve) => {

                tempAudio.addEventListener(
                    "loadedmetadata",
                    resolve,
                    { once: true }
                );

                tempAudio.addEventListener(
                    "error",
                    resolve,
                    { once: true }
                );
            });

            const title =
                file.name
                    .replace(/\.[^/.]+$/, "")
                    .replace(/[_-]/g, " ");

            const newSong = {

                title: title,

                artist:
                    "Local Music",

                duration:
                    isNaN(tempAudio.duration)
                        ? 0
                        : tempAudio.duration,

                cover:
                    DEFAULT_COVER,

                audioBlob:
                    file,

                createdAt:
                    Date.now()
            };

            try {

                const id =
                    await saveSong(newSong);

                newSong.id = id;

                newSong.audio =
                    URL.createObjectURL(
                        newSong.audioBlob
                    );

                songs.push(newSong);

                addedCount++;

            } catch (error) {

                console.error(
                    "Failed to save song:",
                    error
                );
            }

            URL.revokeObjectURL(objectURL);
        }

        musicFileInput.value = "";

        renderPlaylist();

        if (currentSongIndex === -1 &&
            songs.length > 0) {

            loadSong(0, false);
        }

        if (addedCount === 1) {

            showToast(
                "1 song added successfully"
            );

        } else if (addedCount > 1) {

            showToast(
                `${addedCount} songs added successfully`
            );
        }
    }
);

// ===============================
// DELETE SONG
// ===============================

async function deleteSong(index) {

    if (
        index < 0 ||
        index >= songs.length
    ) {
        return;
    }

    const song =
        songs[index];

    const confirmed =
        confirm(
            `Are you sure you want to delete "${song.title}"?`
        );

    if (!confirmed) {
        return;
    }

    const wasCurrent =
        index === currentSongIndex;

    try {

        await deleteSongFromDatabase(
            song.id
        );

        if (song.audio) {
            URL.revokeObjectURL(song.audio);
        }

        if (
            wasCurrent &&
            currentObjectURL
        ) {
            URL.revokeObjectURL(
                currentObjectURL
            );

            currentObjectURL = null;

            audioPlayer.pause();

            audioPlayer.removeAttribute(
                "src"
            );

            audioPlayer.load();
        }

        songs.splice(index, 1);

        if (songs.length === 0) {

            currentSongIndex = -1;

            songTitle.textContent =
                "No Song Selected";

            artistName.textContent =
                "Add music to start listening";

            albumArt.src =
                DEFAULT_COVER;

            currentTime.textContent =
                "0:00";

            duration.textContent =
                "0:00";

            progressBar.value = 0;

            pauseSong();

            showEmptyPlaylist();

        } else {

            if (index < currentSongIndex) {

                currentSongIndex--;

            } else if (
                wasCurrent
            ) {

                if (
                    currentSongIndex >=
                    songs.length
                ) {
                    currentSongIndex =
                        songs.length - 1;
                }

                loadSong(
                    currentSongIndex,
                    false
                );
            }

            renderPlaylist();
        }

        updateFavoriteButton();

        showToast(
            "Song deleted successfully"
        );

    } catch (error) {

        console.error(
            "Delete error:",
            error
        );

        showToast(
            "Unable to delete song"
        );
    }
}

// ===============================
// PLAYLIST
// ===============================

function renderPlaylist() {

    if (songs.length === 0) {

        showEmptyPlaylist();

        return;
    }

    const searchTerm =
        searchInput.value
            .trim()
            .toLowerCase();

    const filteredSongs =
        songs
            .map((song, index) => ({
                song,
                index
            }))
            .filter(({ song }) => {

                return (
                    song.title
                        .toLowerCase()
                        .includes(searchTerm) ||

                    song.artist
                        .toLowerCase()
                        .includes(searchTerm)
                );
            });

    playlist.innerHTML = "";

    playlistCount.textContent =
        `${songs.length} ${
            songs.length === 1
                ? "Song"
                : "Songs"
        }`;

    if (filteredSongs.length === 0) {

        playlist.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">🔎</div>
                <h3>No songs found</h3>
                <p>Try another search.</p>
            </div>
        `;

        return;
    }

    const favorites =
        getFavorites();

    filteredSongs.forEach(
        ({ song, index }) => {

            const item =
                document.createElement("div");

            item.className =
                "playlist-item";

            if (
                index === currentSongIndex
            ) {
                item.classList.add("active");
            }

            const isFavorite =
                favorites.includes(song.id);

            item.innerHTML = `

                <div class="playlist-number">
                    ${
                        index === currentSongIndex
                            && isPlaying
                            ? "♫"
                            : index + 1
                    }
                </div>

                <img
                    class="playlist-cover"
                    src="${song.cover || DEFAULT_COVER}"
                    alt="${song.title}"
                >

                <div class="playlist-song-info">

                    <h3>
                        ${escapeHTML(song.title)}
                    </h3>

                    <p>
                        ${escapeHTML(song.artist)}
                    </p>

                </div>

                <div class="playlist-duration">
                    ${formatTime(song.duration)}
                </div>

                ${
                    isFavorite
                        ? `<span class="playlist-heart">♥</span>`
                        : ""
                }

                <button
                    class="delete-song-btn"
                    title="Delete Song"
                    aria-label="Delete ${escapeHTML(song.title)}"
                >
                    🗑️
                </button>

            `;

            item.addEventListener(
                "click",
                () => {

                    loadSong(index);

                    playSong();
                }
            );

            const deleteButton =
                item.querySelector(
                    ".delete-song-btn"
                );

            deleteButton.addEventListener(
                "click",
                (event) => {

                    event.stopPropagation();

                    deleteSong(index);
                }
            );

            playlist.appendChild(item);
        }
    );
}

// ===============================
// EMPTY PLAYLIST
// ===============================

function showEmptyPlaylist() {

    playlist.innerHTML = `

        <div class="empty-playlist">

            <div class="empty-icon">
                🎵
            </div>

            <h3>
                No Music Added
            </h3>

            <p>
                Click "Add Music" to add songs to your playlist.
            </p>

        </div>

    `;

    playlistCount.textContent = "0 Songs";
}

// ===============================
// SEARCH
// ===============================

searchInput.addEventListener(
    "input",
    () => {

        renderPlaylist();
    }
);

// ===============================
// THEME
// ===============================

function loadTheme() {

    const savedTheme =
        localStorage.getItem(
            "melodifyTheme"
        );

    if (savedTheme === "light") {

        document.body.classList.add(
            "light-theme"
        );

        themeBtn.textContent = "☀️";

    } else {

        themeBtn.textContent = "🌙";
    }
}

themeBtn.addEventListener(
    "click",
    () => {

        document.body.classList.toggle(
            "light-theme"
        );

        const isLight =
            document.body.classList.contains(
                "light-theme"
            );

        localStorage.setItem(
            "melodifyTheme",
            isLight
                ? "light"
                : "dark"
        );

        themeBtn.textContent =
            isLight
                ? "☀️"
                : "🌙";
    }
);

// ===============================
// KEYBOARD CONTROLS
// ===============================

document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.target.tagName ===
            "INPUT"
        ) {
            return;
        }

        if (event.code === "Space") {

            event.preventDefault();

            if (isPlaying) {
                pauseSong();
            } else {
                playSong();
            }
        }

        if (
            event.code === "ArrowRight"
        ) {
            nextSong();
        }

        if (
            event.code === "ArrowLeft"
        ) {
            previousSong();
        }
    }
);

// ===============================
// HTML ESCAPE
// ===============================

function escapeHTML(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ===============================
// CLEANUP
// ===============================

window.addEventListener(
    "beforeunload",
    () => {

        if (currentObjectURL) {

            URL.revokeObjectURL(
                currentObjectURL
            );
        }

        songs.forEach((song) => {

            if (song.audio) {
                URL.revokeObjectURL(
                    song.audio
                );
            }
        });
    }
);

// ===============================
// INITIALIZE
// ===============================

loadTheme();

loadSavedSongs();
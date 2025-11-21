// Changelog module - manages version and changelog data

const Changelog = {
    data: null,

    async load() {
        if (this.data) return this.data;

        try {
            const response = await fetch('assets/data/changelog.json');
            this.data = await response.json();
            return this.data;
        } catch (error) {
            console.error('Failed to load changelog:', error);
            return { version: 'Unknown', entries: [] };
        }
    },

    async getVersion() {
        const data = await this.load();
        return data.version;
    },

    async getEntries(limit = null) {
        const data = await this.load();
        if (limit) {
            return data.entries.slice(0, limit);
        }
        return data.entries;
    },

    renderEntry(entry) {
        const categories = [];

        if (entry.changes.added && entry.changes.added.length) {
            categories.push(`
                <div class="changelog-category changelog-added">
                    <span class="category-label">Added</span>
                    <ul>${entry.changes.added.map(item => `<li>${item}</li>`).join('')}</ul>
                </div>
            `);
        }

        if (entry.changes.changed && entry.changes.changed.length) {
            categories.push(`
                <div class="changelog-category changelog-changed">
                    <span class="category-label">Changed</span>
                    <ul>${entry.changes.changed.map(item => `<li>${item}</li>`).join('')}</ul>
                </div>
            `);
        }

        if (entry.changes.fixed && entry.changes.fixed.length) {
            categories.push(`
                <div class="changelog-category changelog-fixed">
                    <span class="category-label">Fixed</span>
                    <ul>${entry.changes.fixed.map(item => `<li>${item}</li>`).join('')}</ul>
                </div>
            `);
        }

        return `
            <div class="changelog-entry">
                <div class="changelog-header">
                    <span class="changelog-build">Build ${entry.build}</span>
                    <span class="changelog-date">${entry.date}</span>
                </div>
                ${categories.join('')}
            </div>
        `;
    },

    async renderSection(limit = 5) {
        const [version, entries] = await Promise.all([
            this.getVersion(),
            this.getEntries(limit)
        ]);

        return `
            <div class="changelog-section">
                <h2 class="changelog-title">Recent Updates <span class="version-badge">${version}</span></h2>
                <div class="changelog-list">
                    ${entries.map(entry => this.renderEntry(entry)).join('')}
                </div>
                <a href="#/changelog" class="btn btn-outline changelog-view-all">View All Changes</a>
            </div>
        `;
    },

    async renderFullPage() {
        const [version, entries] = await Promise.all([
            this.getVersion(),
            this.getEntries()
        ]);

        return `
            <div class="changelog-page">
                <h1>Changelog <span class="version-badge">${version}</span></h1>
                <p class="changelog-subtitle">Complete history of updates and changes</p>
                <div class="changelog-list">
                    ${entries.map(entry => this.renderEntry(entry)).join('')}
                </div>
                <a href="#/" class="btn btn-outline" style="margin-top: 2rem;">Back to Home</a>
            </div>
        `;
    },

    async updateHeaderVersion() {
        const version = await this.getVersion();
        const versionBadge = document.getElementById('header-version');
        if (versionBadge) {
            versionBadge.textContent = version;
        }
    }
};

export default Changelog;

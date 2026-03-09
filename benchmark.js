const permissionsList = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `manage_resource${i % 10}_${i}`,
    description: 'desc'
}));

console.time('Baseline (1000 renders without useMemo)');
for (let i = 0; i < 1000; i++) {
    permissionsList.reduce((acc, perm) => {
        const parts = perm.name.split('_');
        const action = parts[0];
        const resource = parts.slice(1).join('_') || 'others';
        if (!acc[resource]) acc[resource] = [];
        acc[resource].push(perm);
        return acc;
    }, {});
}
console.timeEnd('Baseline (1000 renders without useMemo)');

console.time('Optimized (1000 renders with useMemo)');
const memoized = permissionsList.reduce((acc, perm) => {
    const parts = perm.name.split('_');
    const action = parts[0];
    const resource = parts.slice(1).join('_') || 'others';
    if (!acc[resource]) acc[resource] = [];
    acc[resource].push(perm);
    return acc;
}, {});
for (let i = 0; i < 1000; i++) {
    const result = memoized;
}
console.timeEnd('Optimized (1000 renders with useMemo)');

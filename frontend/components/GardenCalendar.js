import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, TextInput, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const COLORS = {
  primary: '#2D5A27', accent: '#7CB87A',
  background: '#F5F0E8', text: '#1C2B1A', subtext: '#5A7A58', card: '#fff',
};

const TASK_TYPES = [
  { key: 'watering',   label: 'Water',    icon: 'water',    color: '#2196F3' },
  { key: 'harvesting', label: 'Harvest',  icon: 'basket',   color: '#FF9800' },
  { key: 'planting',   label: 'Plant',    icon: 'leaf',     color: '#4CAF50' },
  { key: 'other',      label: 'Other',    icon: 'ellipsis-horizontal', color: '#9E9E9E' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function GardenCalendar({ gardenId }) {
  const today = new Date();
  const [year, setYear]     = useState(today.getFullYear());
  const [month, setMonth]   = useState(today.getMonth());
  const [tasks, setTasks]   = useState([]);
  const [log, setLog]       = useState([]);
  const [dayModal, setDayModal] = useState(null); // selected date string
  const [taskType, setTaskType] = useState('watering');
  const [taskNote, setTaskNote] = useState('');

  const fetchTasks = useCallback(async () => {
    if (!gardenId) return;
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const end   = `${year}-${String(month + 1).padStart(2, '0')}-31`;
    const { data } = await supabase.from('needs')
      .select('*')
      .eq('garden_id', gardenId)
      .not('task_date', 'is', null)
      .gte('task_date', start)
      .lte('task_date', end)
      .order('task_date');
    setTasks(data || []);
  }, [gardenId, year, month]);

  const fetchLog = useCallback(async () => {
    if (!gardenId) return;
    const { data } = await supabase.from('needs')
      .select('*')
      .eq('garden_id', gardenId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(20);
    setLog(data || []);
  }, [gardenId]);

  useEffect(() => { fetchTasks(); fetchLog(); }, [fetchTasks, fetchLog]);

  const addTask = async () => {
    if (!dayModal) return;
    await supabase.from('needs').insert({
      garden_id: gardenId,
      item: taskNote.trim() || TASK_TYPES.find(t => t.key === taskType)?.label,
      task_date: dayModal,
      task_type: taskType,
    });
    setTaskNote('');
    fetchTasks();
    setDayModal(null);
  };

  const signUp = async (task) => {
    await supabase.from('needs').update({ claimed_by: 'volunteer' }).eq('id', task.id);
    fetchTasks();
  };

  const markDone = async (task) => {
    await supabase.from('needs').update({ completed_at: new Date().toISOString() }).eq('id', task.id);
    fetchTasks();
    fetchLog();
  };

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const tasksByDate = {};
  tasks.forEach(t => {
    if (!t.task_date) return;
    const d = t.task_date.slice(8, 10).replace(/^0/, '');
    if (!tasksByDate[d]) tasksByDate[d] = [];
    tasksByDate[d].push(t);
  });

  const dayTasks = dayModal ? (tasksByDate[String(parseInt(dayModal.slice(8)))] || []) : [];

  return (
    <View style={styles.container}>
      {/* Month nav */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navArrow}>
          <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navArrow}>
          <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={styles.dayHeaders}>
        {DAYS.map(d => <Text key={d} style={styles.dayHeader}>{d}</Text>)}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`empty-${i}`} style={styles.cell} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayTaskList = tasksByDate[String(day)] || [];
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const hasTask = dayTaskList.length > 0;
          return (
            <TouchableOpacity key={day} style={[styles.cell, isToday && styles.cellToday, hasTask && styles.cellHasTask]}
              onPress={() => setDayModal(dateStr)}>
              <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>{day}</Text>
              {hasTask && (
                <View style={styles.taskDots}>
                  {dayTaskList.slice(0, 3).map((t, ti) => (
                    <View key={ti} style={[styles.dot, { backgroundColor: TASK_TYPES.find(tt => tt.key === t.task_type)?.color || COLORS.accent }]} />
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {TASK_TYPES.map(t => (
          <View key={t.key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: t.color }]} />
            <Text style={styles.legendText}>{t.label}</Text>
          </View>
        ))}
      </View>

      {/* Watering / activity log */}
      {log.length > 0 && (
        <View style={styles.logSection}>
          <Text style={styles.logTitle}>Activity Log</Text>
          {log.map(entry => (
            <View key={entry.id} style={styles.logRow}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.accent} />
              <Text style={styles.logText}>
                {entry.item} · {entry.completed_at ? new Date(entry.completed_at).toLocaleDateString() : ''}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Day detail modal */}
      <Modal visible={!!dayModal} transparent animationType="fade"
        onRequestClose={() => setDayModal(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setDayModal(null)}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{dayModal ? new Date(dayModal + 'T12:00:00').toDateString() : ''}</Text>

            {/* Existing tasks for the day */}
            {dayTasks.length > 0 && (
              <ScrollView style={{ maxHeight: 160 }}>
                {dayTasks.map(task => {
                  const tt = TASK_TYPES.find(t => t.key === task.task_type);
                  return (
                    <View key={task.id} style={styles.taskRow}>
                      <Ionicons name={tt?.icon || 'ellipse'} size={16} color={tt?.color || COLORS.subtext} />
                      <Text style={styles.taskText}>{task.item}</Text>
                      <View style={styles.taskBtns}>
                        {!task.claimed_by && (
                          <TouchableOpacity style={styles.signUpBtn} onPress={() => signUp(task)}>
                            <Text style={styles.signUpText}>Sign up</Text>
                          </TouchableOpacity>
                        )}
                        {task.claimed_by && !task.completed_at && (
                          <TouchableOpacity style={[styles.signUpBtn, { backgroundColor: COLORS.primary }]} onPress={() => markDone(task)}>
                            <Text style={[styles.signUpText, { color: '#fff' }]}>Done ✓</Text>
                          </TouchableOpacity>
                        )}
                        {task.completed_at && <Text style={{ fontSize: 11, color: COLORS.accent }}>✓ Done</Text>}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {/* Add new task */}
            <Text style={styles.formLabel}>Add task</Text>
            <View style={styles.taskTypeRow}>
              {TASK_TYPES.map(t => (
                <TouchableOpacity key={t.key}
                  style={[styles.typeBtn, taskType === t.key && { backgroundColor: t.color }]}
                  onPress={() => setTaskType(t.key)}>
                  <Ionicons name={t.icon} size={14} color={taskType === t.key ? '#fff' : COLORS.subtext} />
                  <Text style={[styles.typeBtnText, taskType === t.key && { color: '#fff' }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.noteInput} placeholder="Notes (optional)"
              placeholderTextColor={COLORS.subtext} value={taskNote} onChangeText={setTaskNote} />
            <TouchableOpacity style={styles.addTaskBtn} onPress={addTask}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addTaskText}>Add to Calendar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { backgroundColor: COLORS.card, borderRadius: 16, overflow: 'hidden', margin: 12 },
  monthNav:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: COLORS.primary },
  navArrow:     { padding: 4 },
  monthTitle:   { color: '#fff', fontSize: 16, fontWeight: '700' },
  dayHeaders:   { flexDirection: 'row', backgroundColor: '#EFF7EE' },
  dayHeader:    { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: COLORS.subtext, paddingVertical: 6 },
  grid:         { flexDirection: 'row', flexWrap: 'wrap' },
  cell:         { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: '#F0EDE6' },
  cellToday:    { backgroundColor: '#EFF7EE' },
  cellHasTask:  { backgroundColor: '#F0FAF0' },
  dayNum:       { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  dayNumToday:  { color: COLORS.primary, fontWeight: '800' },
  taskDots:     { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot:          { width: 5, height: 5, borderRadius: 3 },
  legend:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 10, backgroundColor: '#FAFAFA' },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText:   { fontSize: 11, color: COLORS.subtext },
  logSection:   { padding: 12, borderTopWidth: 1, borderTopColor: '#F0EDE6' },
  logTitle:     { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  logRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  logText:      { fontSize: 12, color: COLORS.subtext },
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  handle:       { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  sheetTitle:   { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  taskRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  taskText:     { flex: 1, fontSize: 13, color: COLORS.text },
  taskBtns:     { flexDirection: 'row', gap: 6 },
  signUpBtn:    { backgroundColor: '#EFF7EE', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  signUpText:   { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  formLabel:    { fontSize: 13, fontWeight: '600', color: COLORS.text, marginTop: 14, marginBottom: 8 },
  taskTypeRow:  { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  typeBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: '#EEE' },
  typeBtnText:  { fontSize: 12, fontWeight: '600', color: COLORS.subtext },
  noteInput:    { backgroundColor: COLORS.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text, marginBottom: 10 },
  addTaskBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 12 },
  addTaskText:  { color: '#fff', fontSize: 14, fontWeight: '700' },
});

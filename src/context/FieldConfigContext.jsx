import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  getFieldsCatalog,
  resolveField,
  setActiveField,
  getActiveField,
  getFieldDimensions,
  getFieldImageUrl,
  getDefaultFieldId,
} from '../lib/fieldConfig';
import { readEntity, writeEntity } from '../lib/dataService';

const FieldConfigContext = createContext(null);

export function FieldConfigProvider({ children }) {
  const [selectedFieldId, setSelectedFieldIdState] = useState(getDefaultFieldId());
  const [loaded, setLoaded] = useState(false);
  const userChangedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    readEntity('AppSettings').then(data => {
      if (cancelled || userChangedRef.current) {
        if (!cancelled) setLoaded(true);
        return;
      }
      let settings = data;
      if (Array.isArray(data) && data.length > 0) settings = data[0];
      const id = settings?.selectedFieldId ?? getDefaultFieldId();
      setSelectedFieldIdState(id);
      setActiveField(id);
      setLoaded(true);
    }).catch(() => {
      if (!cancelled && !userChangedRef.current) {
        setActiveField(getDefaultFieldId());
      }
      if (!cancelled) setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  const activeField = useMemo(() => resolveField(selectedFieldId), [selectedFieldId]);

  useEffect(() => {
    if (loaded) setActiveField(selectedFieldId);
  }, [selectedFieldId, loaded]);

  const setSelectedFieldId = useCallback(async (fieldId) => {
    userChangedRef.current = true;
    setSelectedFieldIdState(fieldId);
    setActiveField(fieldId);
    try {
      await writeEntity('AppSettings', { selectedFieldId: fieldId });
    } catch (err) {
      console.error('Failed to save app settings:', err);
    }
  }, []);

  const value = useMemo(() => {
    const dims = getFieldDimensions(activeField);
    return {
      fields: getFieldsCatalog(),
      activeField,
      selectedFieldId,
      setSelectedFieldId,
      widthM: dims.widthM,
      heightM: dims.heightM,
      imageUrl: getFieldImageUrl(activeField),
      loaded,
    };
  }, [activeField, selectedFieldId, setSelectedFieldId, loaded]);

  return (
    <FieldConfigContext.Provider value={value}>
      {children}
    </FieldConfigContext.Provider>
  );
}

export function useFieldConfig() {
  const ctx = useContext(FieldConfigContext);
  if (!ctx) {
    throw new Error('useFieldConfig must be used within FieldConfigProvider');
  }
  return ctx;
}

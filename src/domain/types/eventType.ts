/** Which structured sections an event type expects on its poster. */
export interface EventTypeSections {
  readonly programme: boolean;
  readonly guests: boolean;
  readonly felicitation: boolean;
}

export interface EventTypeDefinition {
  readonly id: string;
  readonly name: string;
  readonly nameLocal?: string;
  readonly description: string;
  /** Material-community icon name used on the selection card. */
  readonly icon: string;
  readonly sections: EventTypeSections;
  /** Asset slots a poster of this type must have filled before export. */
  readonly requiredSlotIds: readonly string[];
  readonly active: boolean;
}
